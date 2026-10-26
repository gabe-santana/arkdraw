; NSIS installer hooks (bundle.windows.nsis.installerHooks).

; .arkdraw files get the ArkDraw document icon instead of the app icon. The file
; class is the association name in tauri.conf.json; uninstalling removes it.
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\ArkDraw Diagram\DefaultIcon" "" "$\"$INSTDIR\icons\arkdraw-file.ico$\""
  !insertmacro UPDATEFILEASSOC
!macroend
