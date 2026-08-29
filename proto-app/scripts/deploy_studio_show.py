#!/usr/bin/env python

import argparse
import os
import subprocess
from getpass import getpass
from datetime import datetime
from paramiko import SSHClient
from paramiko.ssh_exception import PasswordRequiredException

SSH_USER = 'deploy'
DEBUG = False

client = SSHClient()
client.load_system_host_keys()


def did_remote_command_succeed(stdout):
    return stdout.channel.recv_exit_status() == 0


def does_dir_exist(path):
    stdin, stdout, stderr = client.exec_command('stat {}'.format(path))
    return did_remote_command_succeed(stdout)


def main(args):
    try:
        client.connect("studio.stamen.com", username=SSH_USER)
    except PasswordRequiredException:
        print("Your SSH key is encrypted.")
        client.connect(
            "studio.stamen.com",
            username=SSH_USER,
            passphrase=getpass(prompt="ssh key password: ")
        )

    # Ensures local build exists
    local_deploy_path = os.path.abspath(args.deploy_directory)
    if not os.path.exists(local_deploy_path):
        raise Exception(
            "Local build path {} does not exist.".format(local_deploy_path)
        )

    # Ensures studio project dir directory exists
    project_path = '/var/www/com.stamen.studio/{}'.format(
        args.project_dir_name
    )
    if not does_dir_exist(project_path):
        raise Exception(
            "Studio project directory {} does not exist.".format(project_path)
        )

    latest_show_dir_path = '{}/show/latest'.format(project_path)

    # Checks if destination show directory exists
    dir_name = '{}-{}'.format(args.dir_prefix, args.dir_name) if args.dir_prefix else args.dir_name
    dest_show_dir_path = '{}/show/{}'.format(project_path, dir_name)
    if does_dir_exist(dest_show_dir_path):
        if args.overwrite:
            print('Overwriting {}...'.format(dest_show_dir_path))
        else:
            raise Exception(
                'Destination directory {} already exists '.format(
                    dest_show_dir_path
                ) + 'and --overwrite not enabled.'
            )

    # rsync files to server (or --dry-run)
    rsync_command = (
        'rsync -rvt {} --delete {}/ {}@studio.stamen.com:{}/'
    ).format(
        ("--dry-run" if DEBUG else ""),
        local_deploy_path,
        SSH_USER,
        dest_show_dir_path
    )
    print(rsync_command)
    try:
        subprocess.check_call(rsync_command, shell=True)
    except Exception:
        raise Exception(
            'Error while running rsync command.'
        )

    # symlink latest to most recently deployed dir
    if not DEBUG and not args.dont_change_latest:
        stdin, stdout, stderr = client.exec_command(
            'ln -f -n -s {} {}'.format(
                dest_show_dir_path,
                latest_show_dir_path
            )
        )
        if not did_remote_command_succeed(stdout):
            raise Exception(
                'Error while linking latest dir: {}'.format(
                    latest_show_dir_path
                )
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            'Deploy a build directory to a dated subdirectory of `show` on a'
            ' studio project directory and update `show/latest` to point to'
            ' this directory.'
        )
    )
    parser.add_argument(
        'project_dir_name',
        type=str,
        help=(
            'name of project on studio server '
            '(i.e. `studio.stamen.com/<project_dir_name>`)'
        )
    )
    parser.add_argument(
        'deploy_directory',
        type=str,
        help=(
            'path to local project deploy directory (i.e. `./build`)'
        )
    )
    parser.add_argument(
        '--dir-name',
        dest='dir_name',
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help=(
            'The name of the subdirectory directory. '
            'Defaults to timestamp: YEAR-MM-DD.'
        )
    )
    parser.add_argument(
        '--dir-prefix',
        help=(
            'Prefix the default timestamp in the subdirectory name.'
        )
    )
    parser.add_argument(
        '--overwrite',
        dest='overwrite',
        action='store_true',
        help=(
            'Overwrite the build in the named subfolder, useful for '
            're-deploying after bugfixing in conjunction with --dir-name.'
        )
    )
    parser.add_argument(
        '--dont-change-latest',
        action='store_true',
        help=(
            'Leave the /latest symlink untouched. Useful for when '
            'you want to deploy something experimental without '
            'clobbering /latest'
        )
    )
    main(parser.parse_args())