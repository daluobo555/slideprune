using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;

// C# 5 / .NET Framework only. HTTP paths never become filesystem paths.
internal static class SlidePrune
{
    private static int Main(string[] args)
    {
        if (args.Length > 1 || (args.Length == 1 && args[0] != "--no-open"))
        {
            Console.Error.WriteLine("Usage: SlidePrune.exe [--no-open]");
            return 2;
        }
        try
        {
            using (var server = new ResourceServer())
            {
                string url = server.Start();
                Console.WriteLine("SLIDEPRUNE_URL=" + url);
                Console.WriteLine("SlidePrune is running locally. Keep this window open.");
                Console.WriteLine("Open the URL above in your browser. Press Enter or Ctrl+C to stop.");
                Console.Out.Flush();
                Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs eventArgs)
                {
                    eventArgs.Cancel = true;
                    server.Stop();
                };
                var input = new Thread(delegate() { Console.ReadLine(); server.Stop(); });
                input.IsBackground = true;
                input.Start();
                if (args.Length == 0)
                {
                    try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
                    catch (Exception) { Console.Error.WriteLine("Could not open a browser. Copy the URL above instead."); }
                }
                server.WaitUntilStopped();
            }
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("SlidePrune could not start: " + error.Message);
            return 1;
        }
    }
}

internal sealed class ResourceServer : IDisposable
{
    private const int MaximumHeaderBytes = 16384;
    private const int HeaderTimeoutMilliseconds = 3000;
    private const int MaximumClients = 16;
    private readonly Assembly assembly = Assembly.GetExecutingAssembly();
    private readonly Dictionary<string, string> resources = new Dictionary<string, string>(StringComparer.Ordinal);
    private readonly TcpListener listener = new TcpListener(IPAddress.Loopback, 0);
    private readonly HashSet<TcpClient> clients = new HashSet<TcpClient>();
    private readonly object gate = new object();
    private readonly ManualResetEvent stopped = new ManualResetEvent(false);
    private bool stopping;
    private string authority;

    internal ResourceServer()
    {
        foreach (string name in assembly.GetManifestResourceNames())
            if (name.StartsWith("web/", StringComparison.Ordinal)) resources.Add("/" + name.Substring(4), name);
        if (!resources.ContainsKey("/index.html")) throw new InvalidOperationException("The embedded application is missing.");
    }

    internal string Start()
    {
        listener.ExclusiveAddressUse = true;
        listener.Start(MaximumClients);
        authority = "127.0.0.1:" + ((IPEndPoint)listener.LocalEndpoint).Port.ToString(CultureInfo.InvariantCulture);
        var accept = new Thread(AcceptClients);
        accept.IsBackground = true;
        accept.Start();
        return "http://" + authority + "/";
    }

    private void AcceptClients()
    {
        try
        {
            while (true)
            {
                TcpClient client = listener.AcceptTcpClient();
                client.ReceiveTimeout = HeaderTimeoutMilliseconds;
                client.SendTimeout = HeaderTimeoutMilliseconds;
                lock (gate)
                {
                    if (stopping || clients.Count >= MaximumClients) { client.Close(); continue; }
                    clients.Add(client);
                }
                ThreadPool.QueueUserWorkItem(delegate { Serve(client); });
            }
        }
        catch (SocketException) { Stop(); }
        catch (ObjectDisposedException) { Stop(); }
    }

    private void Serve(TcpClient client)
    {
        bool head = false;
        bool responseStarted = false;
        try
        {
            NetworkStream stream = client.GetStream();
            string header = ReadHeader(stream);
            if (header == null) return;
            string[] lines = header.Split(new[] { "\r\n" }, StringSplitOptions.None);
            string[] request = lines[0].Split(' ');
            if (request.Length != 3 || (request[2] != "HTTP/1.1" && request[2] != "HTTP/1.0"))
                throw new HttpFailure(400, "Bad Request");
            head = request[0] == "HEAD";
            if (request[0] != "GET" && !head) throw new HttpFailure(405, "Method Not Allowed");
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 1; i < lines.Length; i++)
            {
                if (lines[i].Length == 0) continue;
                int colon = lines[i].IndexOf(':');
                if (colon <= 0) throw new HttpFailure(400, "Bad Request");
                string name = lines[i].Substring(0, colon);
                foreach (char c in name)
                    if (!IsHeaderNameCharacter(c)) throw new HttpFailure(400, "Bad Request");
                if (headers.ContainsKey(name)) throw new HttpFailure(400, "Bad Request");
                headers.Add(name, lines[i].Substring(colon + 1).Trim());
            }
            string host;
            if (!headers.TryGetValue("Host", out host) || host != authority) throw new HttpFailure(403, "Forbidden");
            string length;
            if (headers.ContainsKey("Transfer-Encoding") ||
                (headers.TryGetValue("Content-Length", out length) && length != "0"))
                throw new HttpFailure(400, "Bad Request");
            string path = ResourcePath(request[1]);
            string resource;
            if (!resources.TryGetValue(path, out resource)) throw new HttpFailure(404, "Not Found");
            using (Stream content = assembly.GetManifestResourceStream(resource))
            {
                responseStarted = true;
                WriteHeaders(stream, 200, "OK", ContentType(path), content.Length);
                if (!head) content.CopyTo(stream);
            }
        }
        catch (HttpFailure error) { TryError(client, error.Code, error.Message, head); }
        catch (IOException) { if (!responseStarted) TryError(client, 408, "Request Timeout", head); }
        catch (SocketException) { }
        catch (ObjectDisposedException) { }
        catch (InvalidOperationException) { }
        finally
        {
            lock (gate) clients.Remove(client);
            client.Close();
        }
    }

    private static string ReadHeader(NetworkStream stream)
    {
        var buffer = new byte[MaximumHeaderBytes];
        int count = 0;
        var elapsed = Stopwatch.StartNew();
        while (count < buffer.Length)
        {
            int remaining = HeaderTimeoutMilliseconds - (int)elapsed.ElapsedMilliseconds;
            if (remaining <= 0) throw new HttpFailure(408, "Request Timeout");
            stream.ReadTimeout = remaining;
            int read = stream.Read(buffer, count, Math.Min(1024, buffer.Length - count));
            if (read == 0) return null;
            int previous = count;
            count += read;
            for (int i = previous; i < count; i++)
            {
                byte b = buffer[i];
                if ((b < 32 && b != 13 && b != 10 && b != 9) || b > 126)
                    throw new HttpFailure(400, "Bad Request");
                if (i >= 3 && buffer[i - 3] == 13 && buffer[i - 2] == 10 && buffer[i - 1] == 13 && b == 10)
                    return Encoding.ASCII.GetString(buffer, 0, i - 3);
            }
        }
        throw new HttpFailure(431, "Request Header Fields Too Large");
    }

    private static string ResourcePath(string target)
    {
        if (target.Length > 2048) throw new HttpFailure(414, "URI Too Long");
        if (!target.StartsWith("/", StringComparison.Ordinal) || target.StartsWith("//", StringComparison.Ordinal))
            throw new HttpFailure(400, "Bad Request");
        int query = target.IndexOf('?');
        string path = query < 0 ? target : target.Substring(0, query);
        // Generated Vite resource names are ASCII; encoded and alternate path forms are unnecessary.
        foreach (char c in path)
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
                c == '/' || c == '.' || c == '_' || c == '-')) throw new HttpFailure(400, "Bad Request");
        foreach (string segment in path.Split('/'))
            if (segment == "." || segment == "..") throw new HttpFailure(400, "Bad Request");
        return path == "/" ? "/index.html" : path;
    }

    private static bool IsHeaderNameCharacter(char c)
    {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
            "!#$%&'*+-.^_`|~".IndexOf(c) >= 0;
    }

    private static string ContentType(string path)
    {
        switch (Path.GetExtension(path).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".wasm": return "application/wasm";
            case ".json": return "application/json; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".pdf": return "application/pdf";
            case ".ttf": return "font/ttf";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            default: return "application/octet-stream";
        }
    }

    private static void WriteHeaders(NetworkStream stream, int status, string reason, string type, long length)
    {
        string header = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type +
            "\r\nContent-Length: " + length.ToString(CultureInfo.InvariantCulture) +
            "\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n" +
            (status == 405 ? "Allow: GET, HEAD\r\n" : "") + "\r\n";
        byte[] bytes = Encoding.ASCII.GetBytes(header);
        stream.Write(bytes, 0, bytes.Length);
    }

    private static void TryError(TcpClient client, int status, string reason, bool head)
    {
        try
        {
            byte[] body = Encoding.ASCII.GetBytes(reason + "\n");
            NetworkStream stream = client.GetStream();
            WriteHeaders(stream, status, reason, "text/plain; charset=utf-8", body.Length);
            if (!head) stream.Write(body, 0, body.Length);
        }
        catch (IOException) { }
        catch (SocketException) { }
        catch (ObjectDisposedException) { }
        catch (InvalidOperationException) { }
    }

    internal void WaitUntilStopped() { stopped.WaitOne(); }
    internal void Stop()
    {
        lock (gate)
        {
            if (stopping) return;
            stopping = true;
            listener.Stop();
            foreach (TcpClient client in clients) client.Close();
            stopped.Set();
        }
    }
    public void Dispose() { Stop(); }

    private sealed class HttpFailure : Exception
    {
        internal readonly int Code;
        internal HttpFailure(int code, string reason) : base(reason) { Code = code; }
    }
}
