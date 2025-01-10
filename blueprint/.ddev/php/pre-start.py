import os
import subprocess

FILE = ".ddev/php/xdebug-local.ini"


def append_to_file(key, value):
    """
    Append a key-value pair to a file

    Args:
        key (str): The key to append
        value (str): The value to append
    """
    with open(FILE, "a") as f:
        f.write(f"{key}={value}\n")


def get_docker_ip():
    """
    Get the IP address of the Docker host

    Returns:
        str: The IP address of the Docker host
    """

    result = subprocess.run(
        ["docker", "network", "inspect", "bridge"], capture_output=True, text=True
    )
    for line in result.stdout.splitlines():
        if "Gateway" in line:
            return line.split(":")[1].strip().strip(' "')
    return None


def create_xdebug_config():
    """
    Create the xdebug-local.ini file and set additional configuration options
    """
    if os.path.exists(FILE):
        os.remove(FILE)
    with open(FILE, "w") as f:
        f.write("[xdebug]\n")
        f.write("xdebug.remote_host=" + get_docker_ip() + "\n")


create_xdebug_config()
