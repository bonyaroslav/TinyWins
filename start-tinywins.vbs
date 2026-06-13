Set WshShell = CreateObject("WScript.Shell")

WshShell.CurrentDirectory = "G:\Other computers\My Computer\MDocs\Tools\progress-tracker"

WshShell.Run "cmd /c python -m http.server 8787 --bind 127.0.0.1 > server.out.log 2> server.err.log", 0, False