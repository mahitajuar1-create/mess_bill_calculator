$gas = [System.IO.File]::ReadAllText("$PSScriptRoot\..\google-apps-script\Index.html", [System.Text.Encoding]::UTF8)
$pos1 = $gas.IndexOf('id: "SUG-20261005-001"')
$pos2 = $gas.IndexOf('totalFood: 310.00', $pos1)
Write-Host "Gas pos1:" $pos1 "pos2:" $pos2

$root = [System.IO.File]::ReadAllText("$PSScriptRoot\..\index.html", [System.Text.Encoding]::UTF8)
$r_pos1 = $root.IndexOf('id: "SUG-20261005-001"')
$r_pos2 = $root.IndexOf('totalFood: 310.00', $r_pos1)
Write-Host "Root r_pos1:" $r_pos1 "r_pos2:" $r_pos2

if ($pos1 -ge 0 -and $pos2 -ge 0 -and $r_pos1 -ge 0 -and $r_pos2 -ge 0) {
    # In $gas, find the start of the corrupted line right before totalFood: 310.00
    # That corrupted line ended with ': "..."'
    $corrupt_end = $gas.LastIndexOf("`n", $pos2) + 1
    # In $root, find the start of the line with totalFood: 310.00
    $good_end = $root.LastIndexOf("`n", $r_pos2) + 1
    
    $good_chunk = $root.Substring($r_pos1, $good_end - $r_pos1)
    $gas_fixed = $gas.Substring(0, $pos1) + $good_chunk + $gas.Substring($corrupt_end)
    [System.IO.File]::WriteAllText("$PSScriptRoot\..\google-apps-script\Index.html", $gas_fixed, [System.Text.Encoding]::UTF8)
    Write-Host "SUCCESSFULLY RESTORED!"
}
