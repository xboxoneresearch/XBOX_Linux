gzip -c libv86.js > libv86.js.gz
cat libv86.js.gz | base64 -w0 > libv86.js.base64
rm libv86.js.gz
gzip -c v86.wasm > v86.wasm.gz
cat v86.wasm.gz | base64 -w0 > v86.wasm.base64
rm v86.wasm.gz
gzip -c seabios.bin > seabios.bin.gz
cat seabios.bin.gz | base64 -w0 > seabios.bin.base64
rm seabios.bin.gz
cat linuxiso | base64 -w0 > linuxiso.base64
LIBV86_BASE64=$(< libv86.js.base64)
WASM_BASE64=$(< v86.wasm.base64)
BIOS_BASE64=$(< seabios.bin.base64)
LINUXISO_BASE64=$(< linuxiso.base64)
sed -i -f - nodejs.js << EOF
s|\$LIBV86_BASE64|$LIBV86_BASE64|g
EOF
sed -i -f - nodejs.js << EOF
s|\$WASM_BASE64|$WASM_BASE64|g
EOF
sed -i -f - nodejs.js << EOF
s|\$BIOS_BASE64|$BIOS_BASE64|g
EOF
sed -i -f - nodejs.js << EOF
s|\$LINUXISO_BASE64|$LINUXISO_BASE64|g
EOF
google-closure-compiler --compilation_level SIMPLE --js nodejs.js --js_output_file VM.js --warning_level QUIET