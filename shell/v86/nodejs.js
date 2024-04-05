#!/usr/bin/env node
"use strict";

var fs = require("fs");
var V86 = require("./libv86.js").V86;

function readfile(path)
{
    return new Uint8Array(fs.readFileSync(path)).buffer;
}

var bios = readfile(__dirname + "/seabios.bin");
var linux = readfile(__dirname + "/linux.iso");

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

console.log("Now booting, please stand by ...");

var emulator = new V86({
    memory_size: 3.9 * 1024 * 1024 * 1024,
    bios: {
        buffer: bios,
    },
    hda: {
        buffer: linux,
        async: true,
    },

    acpi: false,
    autostart: true,
});

emulator.add_listener("serial0-output-byte", function(byte)
{
    var chr = String.fromCharCode(byte);
    if(chr <= "~")
    {
        process.stdout.write(chr);
    }
});

process.stdin.on("data", function(c)
{
    if(c === "\u0003")
    {
        // ctrl c
        emulator.stop();
        process.stdin.pause();
    }
    else
    {
        emulator.serial0_send(c);
    }
});
