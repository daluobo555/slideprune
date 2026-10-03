param(
    [Parameter(Mandatory = $true)][string]$SourceFolder,
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [Parameter(Mandatory = $true)][string]$FontSourceName,
    [Parameter(Mandatory = $true)][string]$FontSourceHash
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
function Get-StreamHash([System.IO.Stream]$InputStream) {
    $streamHasher = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($streamHasher.ComputeHash($InputStream)).Replace('-', '') }
    finally { $streamHasher.Dispose() }
}
$sourceRoot = (Get-Item -LiteralPath $SourceFolder).FullName.TrimEnd('\')
$rootName = Split-Path -Leaf $sourceRoot
$sourceFiles = @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -File)
$expectedHashes = @{}
$packageArchive = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($sourceFile in $sourceFiles) {
        $relative = $sourceFile.FullName.Substring($sourceRoot.Length + 1).Replace('\', '/')
        $entryName = $rootName + '/' + $relative
        $sourceStream = [System.IO.File]::OpenRead($sourceFile.FullName)
        try { $expectedHashes[$entryName] = Get-StreamHash $sourceStream }
        finally { $sourceStream.Dispose() }
        [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $packageArchive, $sourceFile.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $packageArchive.Dispose() }

# Read every entry back; a successful compression call alone is not delivery evidence.
$packageArchive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
    if ($packageArchive.Entries.Count -ne $expectedHashes.Count) { throw 'ZIP entry count differs from package contents' }
    foreach ($entry in $packageArchive.Entries) {
        $entryStream = $entry.Open()
        try {
            $entryHash = Get-StreamHash $entryStream
            if ($entryHash -ne $expectedHashes[$entry.FullName]) { throw ('ZIP integrity failed: ' + $entry.FullName) }
        } finally { $entryStream.Dispose() }
    }
    $fontEntry = $rootName + '/third-party-sources/' + $FontSourceName
    if ($expectedHashes[$fontEntry] -ne $FontSourceHash) { throw 'Font source is missing or does not match the audited release' }
} finally { $packageArchive.Dispose() }
