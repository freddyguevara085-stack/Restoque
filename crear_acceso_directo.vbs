Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
strDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

Set oShortcut = WshShell.CreateShortcut(strDesktop & "\Restoque POS.lnk")
oShortcut.TargetPath = "wscript.exe"
oShortcut.Arguments = """" & strDir & "\iniciar_restoque.vbs"""
oShortcut.WorkingDirectory = strDir
oShortcut.Description = "Sistema de Punto de Venta e Inventario Restoque"
oShortcut.IconLocation = "shell32.dll, 258"
oShortcut.Save

Set oShortcut = Nothing
Set WshShell = Nothing
