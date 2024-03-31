Based on TinyEmu (Mini Qemu) / v86:
Fabrice Bellard is the developer of QEMU and TinyEMU which is an experimental JS port of QEMU

https://bellard.org/tinyemu/ - JS QEMU Engine

https://github.com/killinux/jslinux-bellard - Web hosted JS QEMU x86 VM Client Proof-of-Concept

https://github.com/copy/v86 - Web hosted JS QEMU x86 VM Client

https://github.com/superdinmc/v86-NodeVM - Node Integration demo for JS Qemu x86 VM

[Build Requirements]

Java - https://www.java.com/en/download/ | jre-openjdk

NPM - https://www.java.com/en/download | npm

Bash - via native Linux Shell, or Windows Subsystem for Linux

Node.js - https://nodejs.org/en/download/current | nodejs

google-closure-compiler - https://github.com/google/closure-compiler | npm i -g google-closure-compiler

QEMU - https://www.qemu.org/ | qemu qemu-img

[Dependencies]

Place the following binaries in this directory, and run "bash build.sh" to build VM.js:

libv86.js
https://github.com/copy/v86/releases/tag/latest

v86.wasm
https://github.com/copy/v86/releases/tag/latest

seabios.bin
https://github.com/copy/v86/blob/master/bios/seabios.bin

linux.img (Linux QEMU generated Raw Virtual Hard Disk)
https://qemu-project.gitlab.io/qemu/tools/qemu-img.html

Note: The Linux Installation should output to ttyS0 on login.
It is recommended this virtual disk also use a syslinux bootloader with SERIAL output and console=ttyS0 passed on the kernel parameter. Otherwise the console will hang at please wait.

[Xbox Deployment Execution]

Download Node.js for windows binary (.zip) and extract the directory to Xbox.

Copy the generated VM.js in the same directory next to node.exe on Xbox.

SSH into Xbox and run "node linux"

[Creating linux.img]


This document partly also applies to other Linux distros
MANY items in this example document have been modified for node usage for the Xbox.
The original document can be found here for reference.
https://github.com/copy/v86/blob/master/docs/archlinux.md

Choosing an installer ISO
-------------------------

Download Arch Linux 32 from  https://archlinux32.org.

Basic installation using QEMU
-----------------------

Installing Arch Linux with these instructions will result in a raw disk image that can be booted by v86.

```sh
# fetch archlinux32 installer, edit this URL with latest image
wget https://mirror.archlinux32.org/archisos/archlinux32-2023.03.02-i686.iso

# Create a 10 gigabyte disk image. If you intend to pacstrap only 'base' then 1.5G should be fine also.
qemu-img create arch.img 10G

# Follow the normal installation process (you can add accel=kvm if your system supports it to speed up the installation)
qemu-system-x86_64 -m 256 -drive file=arch.img,format=raw -cdrom archlinux32-2021.12.01-i686.iso
```

For keyboard support, it is necessary to open /etc/mkinitcpio.conf and edit the following line:

```sh
MODULES="atkbd i8042"
```

For the changes to take effect, you need to regenerate the initial ramdisk with `mkinitcpio -p linux`

The resulting `arch.img` file is a bootable disk image for v86.

Scripting image creation for v86
--------------------------------

Installing the ISO by hand takes a long time if you intend to recreate the image many times. There are various reasons why you might want to do this more than once. For example: because the emulator is slow you might want to compile any new software release in QEMU which is much faster and then use the resulting image in v86 instead of making the emulator compile the software. Another reason is that the build progress potentially takes long and if you want to do automated builds in parallel to find out what configurations do and don't work you can just throw more computing power at the problem in order to solve it. This example requires that you have `packer`, `qemu` and `kpartx` installed.

### Creating a packer template

[Packer](https://www.packer.io/docs/builders/qemu.html) is a tool that lets you boot an ISO in any of multiple emulators (so QEMU in our case) and send pre-scripted keystrokes to bootstrap and SSH server. Once the SSH connection is established a script can be started for further provisioning.

Create a template for automating the base installation:
```sh
mkdir -p packer
cat > packer/template.json << 'EOF'
{
  "provisioners": [
    {
      "type": "shell",
      "override": {
        "qemu": {
          "scripts": ["scripts/provision.sh"]
        }
      }
    }
  ],
  "builders": [
    {
      "accelerator": "kvm",
      "type": "qemu",
      "boot_command": [
        "<enter><wait30><enteropenssl passwd help<wait10>",
        "dhcpcd<enter><wait5>",
        "echo root:root | chpasswd<enter><wait5>",
        "systemctl start sshd<enter>"
      ],
      "headless": true,
      "boot_wait": "10s",
      "disk_size": 1500,
      "disk_interface": "ide",
      "iso_url": "https://mirror.archlinux32.org/archisos/archlinux32-2021.12.01-i686.iso",
      "iso_checksum": "90c6f5aecb095d5578f6c9970539da7c5e9324ec",
      "iso_checksum_type": "sha1",
      "ssh_wait_timeout": "120s",
      "ssh_pty": true,
      "ssh_username": "root",
      "ssh_password": "root",
      "ssh_port": 22,
      "format": "raw",
      "vm_name": "archlinux",
      "disk_detect_zeroes": "unmap",
      "memory": 2048,
      "vnc_bind_address": "0.0.0.0"
    }
  ]
}
EOF
```

You can tweak the options a bit to match your situation. For debugging, you can set `headless` to `false`. That will show you the VNC connection instead of running the `boot_command` in the background. For a `base` pacstrap, using a 2 GB disk image should be sufficient. The `raw` disk format is important. v86 does not read qcow2 images, only raw disk images. If your system does not support KVM (the default accelerator), you can change `"accelerator": "none"` to the settings, in macos you may use `"accelerator": "hvf"`. Other accelerator options can be found [here](https://www.packer.io/docs/builders/qemu.html#accelerator).

After gaining SSH connectivity to the VM, packer will run the `scripts/provisioning.sh` script in the guest.

### Creating the Arch Linux installation script

Create a script for your Arch Linux installation. This runs in the live Arch Linux environment, so you need to partition the disk, do a pacstrap, and install a bootloader.
```sh
mkdir -p packer/scripts
### Write your own or copy paste the example below
vim packer/scripts/provision.sh
```

An example script to install Arch Linux with the root mounted using the 9p network filesystem:
```sh
#!/bin/bash
echo "Creating a GPT partition on /dev/sda1"
echo -e "g\nn\n\n\n\nw" | fdisk /dev/sda

# In case you might want to create a DOS partition instead. It doesn't really matter.
#echo "Creating a DOS partition on /dev/sda1"
#echo -e "o\nn\np\n1\n\n\nw" | fdisk /dev/sda

echo "Formatting /dev/sda1 to ext4"
mkfs -t ext4 /dev/sda1

echo "Mounting new filesystem"
mount -t ext4 /dev/sda1 /mnt

echo "Create pacman package cache dir"
mkdir -p /mnt/var/cache/pacman/pkg

# We don't want the pacman cache to fill up the image. After reboot whatever tarballs pacman has cached are gone.
echo "Mount the package cache dir in memory so it doesn't fill up the image"
mount -t tmpfs none /mnt/var/cache/pacman/pkg

echo "Updating archlinux-keyring"

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf
pacman -Sy archlinux-keyring archlinux32-keyring archlinux-keyring
pacman-key --init
pacman-key --populate archlinux32
pacman-key --populate archlinux
pacman-key --refresh

# Install the Arch Linux base system, feel free to add packages you need here
echo "Performing pacstrap"
pacstrap -i /mnt base linux dhcpcd curl openssh neofetch base-devel --noconfirm

echo "Writing fstab"
genfstab -p /mnt >> /mnt/etc/fstab

# When the Linux boots we want it to automatically log in on tty1 as root
echo "Ensuring root autologin"
mkdir -p /mnt/etc/systemd/system/getty@ttyS0.service.d
mkdir -p /mnt/etc/systemd/system/getty@tty1.service.d
cat << 'EOF' > /mnt/etc/systemd/system/getty@tty1.service.d/override.conf
[Service]
ExecStart=
ExecStart=-/usr/bin/agetty --autologin root --noclear %I $TERM
EOF
cat << 'EOF' > /mnt/etc/systemd/system/getty@ttyS0.service.d/override.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty -o '-p -f -- \\u' --keep-baud --autologin root 115200,57600,38400,9600 - $TERM
EOF

echo "Writing the installation script"

cat << 'EOF' > /mnt/bootstrap.sh
#!/usr/bin/bash
echo "Re-generate initial ramdisk environment"
mkinitcpio -p linux

sed -i 's/SigLevel.*/SigLevel = Never/g' /etc/pacman.conf
pacman -Sy archlinux-keyring archlinux32-keyring archlinux-keyring
pacman-key --init
pacman-key --populate archlinux32
pacman-key --populate archlinux
pacman-key --refresh

pacman -S --noconfirm syslinux gptfdisk
syslinux-install_update -i -a -m

# disabling ldconfig to speed up boot (to remove Rebuild dynamic linker cache...)
# you may want to comment this out
#echo "Disabling ldconfig service"
#systemctl mask ldconfig.service

sync
EOF

echo "Chrooting and bootstrapping the installation"
arch-chroot /mnt bash bootstrap.sh


cat << 'EOF' > /mnt/boot/syslinux/syslinux.cfg
# Config file for Syslinux -
# /boot/syslinux/syslinux.cfg
#
# Comboot modules:
#   * menu.c32 - provides a text menu
#   * vesamenu.c32 - provides a graphical menu
#   * chain.c32 - chainload MBRs, partition boot sectors, Windows bootloaders
#   * hdt.c32 - hardware detection tool
#   * reboot.c32 - reboots the system
#
# To Use: Copy the respective files from /usr/lib/syslinux to /boot/syslinux.
# If /usr and /boot are on the same file system, symlink the files instead
# of copying them.
#
# If you do not use a menu, a 'boot:' prompt will be shown and the system
# will boot automatically after 5 seconds.
#
# Please review the wiki: https://wiki.archlinux.org/index.php/Syslinux
# The wiki provides further configuration examples

DEFAULT archlinux
PROMPT 0        # Set to 1 if you always want to display the boot: prompt
TIMEOUT 300

# Menu Configuration
# Either menu.c32 or vesamenu32.c32 must be copied to /boot/syslinux
UI menu.c32
#UI vesamenu.c32

# Refer to http://syslinux.zytor.com/wiki/index.php/Doc/menu
#MENU TITLE Arch Linux
#MENU BACKGROUND splash.png
#MENU COLOR border       30;44   #40ffffff #a0000000 std
#MENU COLOR title        1;36;44 #9033ccff #a0000000 std
#MENU COLOR sel          7;37;40 #e0ffffff #20ffffff all
#MENU COLOR unsel        37;44   #50ffffff #a0000000 std
#MENU COLOR help         37;40   #c0ffffff #a0000000 std
#MENU COLOR timeout_msg  37;40   #80ffffff #00000000 std
#MENU COLOR timeout      1;37;40 #c0ffffff #00000000 std
#MENU COLOR msg07        37;40   #90ffffff #a0000000 std
#MENU COLOR tabmsg       31;40   #30ffffff #00000000 std

LABEL archlinux
    MENU LABEL Arch Linux
    SERIAL 0 115200
    LINUX ../vmlinuz-linux
    APPEND root=/dev/sda1 rw nomodeset console=ttyS0,115200 loglevel=7
    INITRD ../initramfs-linux.img

#LABEL hdt
#        MENU LABEL HDT (Hardware Detection Tool)
#        COM32 hdt.c32

#LABEL reboot
#        MENU LABEL Reboot
#        COM32 reboot.c32

#LABEL poweroff
#        MENU LABEL Poweroff
#        COM32 poweroff.c32
EOF
umount -R /mnt
```
