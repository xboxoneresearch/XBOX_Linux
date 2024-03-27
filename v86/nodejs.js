var zlib = require("zlib");
//await _g.unzip(Buffer.from('COMPRESSED','Base64'))
_g = {
    zip: function gzip(input, options) {
        var promise = new Promise(function (resolve, reject) {
            zlib.gzip(input, options, function (error, result) {
                if (!error) resolve(result);
                else reject(Error(error));
            });
        });
        return promise;
    },
    unzip: function ungzip(input, options) {
        var promise = new Promise(function (resolve, reject) {
            zlib.gunzip(input, options, function (error, result) {
                if (!error) resolve(result);
                else reject(Error(error));
            });
        });
        return promise;
    },
};
let consize = process.stdout.getWindowSize();
(async () => {
    var fs = require("fs");
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[#10=======]`
        );
    if (!process.argv[2]) console.log("Initializing library...");
    const delay = (delayInms) => {
        return new Promise((resolve) => setTimeout(resolve, delayInms));
    };
    fs.writeFileSync(
        "libv86.js",
        await _g.unzip(
            Buffer.from(
                "$LIBV86_BASE64",
                "Base64"
            )
        )
    );
    let wasm = await _g.unzip(Buffer.from('$WASM_BASE64','Base64'))
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[##20======]`
        );
    var V86Starter = require("./libv86.js").V86Starter;
    fs.unlinkSync("libv86.js");
    if (!process.argv[2]) console.log("Initializing BIOS image...");
    const bios = new Uint8Array(
        await _g.unzip(
            Buffer.from('$BIOS_BASE64','Base64')
        )
    ).buffer;
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[###30=====]`
        );
    if (!process.argv[2]) console.log("Initializing linux image...");
    const linux = new Uint8Array(
        Buffer.from(
            "$LINUXISO_BASE64",
            "Base64"
        )
    ).buffer;
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[####40====]`
        );
    if (!process.argv[2]) console.log("Initializing STD stream...");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    if (!process.argv[2]) process.stdout.write("\033c");
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2)};${Math.floor(
                consize[0] / 2 - 7
            )}HStarting VM...`
        );
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[####50====]`
        );
    let initialized = !!process.argv[2];
    if (fs.existsSync("NodeVM_autosave.bin")) {
        let b = fs.readFileSync("NodeVM_autosave.bin");
        var emulator = new V86Starter({
            bios: { buffer: bios },
            cdrom: { buffer: linux },
            wasm_fn: async (env) =>
                (await WebAssembly.instantiate(wasm, env)).instance.exports,
            autostart: true,
            fastboot: true,
            initial_state: b.buffer.slice(
                b.byteOffset,
                b.byteOffset + b.byteLength
            ),
        });
    } else
        var emulator = new V86Starter({
            bios: { buffer: bios },
            cdrom: { buffer: linux },
            wasm_fn: async (env) =>
                (await WebAssembly.instantiate(wasm, env)).instance.exports,
            autostart: true,
            fastboot: true,
        });
    if (!process.argv[2]) await delay(1000);
    if (!process.argv[2]) process.stdout.write("\033c");
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2)};${Math.floor(
                consize[0] / 2 - 14.5
            )}HBooting linux, Please standby...`
        );
    if (!process.argv[2])
        process.stdout.write(
            `\x1b[${Math.floor(consize[1] / 2) + 1};${Math.floor(
                consize[0] / 2 - 7
            )}H[######75==]`
        );
    var stackOut = [],
        stackIn = [];
    emulator.add_listener("serial0-output-char", async function (chr) {
        if (chr <= "~" && stackOut.length > 47) {
            if (stackOut.length == 48 && process.argv[2]) {
                emulator.serial0_send(process.argv.slice(2).join(" ") + "\n");
            } else if (
                process.argv[2] &&
                stackOut.slice(55).join("").endsWith("/root%")
            ) {
                console.log(
                    stackOut
                        .slice(55 + process.argv.slice(2).join(" ").length)
                        .slice(0, -9)
                        .join("")
                );
                let state = await emulator.save_state();
                fs.writeFileSync("NodeVM_autosave.bin", Buffer.from(state));
                emulator.stop();
                process.stdin.pause();
            } else if (!process.argv[2]) process.stdout.write(chr);
            //console.log(stackOut.slice(-99));
        }
        stackOut.push(chr);
        if (stackOut.length > 100 && !process.argv[2]) stackOut.shift();
        //if (stack.join("") == "\r\r\nWelcome to Buildroot\r\n\r(none) login: ") {
        if (
            stackOut
                .join("")
                .endsWith("Welcome to Buildroot\r\n\r(none) login: ")
        ) {
            emulator.serial0_send("root\n");
            if (!initialized) {
                process.stdout.write("\033c");
                initialized = true;
            }
            if (!process.argv[2])
                console.log(
                    'for list of commands, type "busybox" | to exit, press Ctrl+C'
                );
        }
    });

    process.stdin.on("data", async function (c) {
        stackIn.push(c);
        if (stackIn.length > 100) stackIn.shift();
        if (
            (c === "\u0003" &&
            /\/{0,1}[a-zA-Z-\d_]+(%| #) $/.test(stackOut.join("")))
        ) {
            // ctrl c
            process.stdout.write("\033c");
            let state = await emulator.save_state();
            fs.writeFileSync("NodeVM_autosave.bin", Buffer.from(state));
            emulator.stop();
            process.stdin.pause();
        } else {
            emulator.serial0_send(c);
        }
    });
})();
