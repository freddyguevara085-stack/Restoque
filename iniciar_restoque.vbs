Set WshShell = CreateObject("WScript.Shell")
strDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

' Ejecutar el servidor en segundo plano sin mostrar ventana negra de terminal (0 = oculto)
WshShell.Run "cmd /c """ & strDir & "\iniciar_restoque.bat""", 0, False

' Esperar 2 segundos para dar tiempo al servidor y abrir la app en el navegador
WScript.Sleep 2000
WshShell.Run "http://localhost:8000"

Set WshShell = Nothing
