import os
import subprocess


def update_nginx_config():
    """
    Update the Nginx configuration to include XDEBUG_TRIGGER
    """
    nginx_conf_path = ".ddev/nginx_full/nginx-site.conf"
    if not os.path.exists(nginx_conf_path):
        print(f"Nginx configuration file not found at {nginx_conf_path}")
        return

    # check if the location block for PHP is already updated
    with open(nginx_conf_path, "r") as f:
        content = f.read()
        if "fastcgi_param XDEBUG_TRIGGER 1;" in content:
            print("Nginx configuration already updated for XDEBUG_TRIGGER.")
            return

    print(f"Updating Nginx configuration at {nginx_conf_path}...")
    # add the fastcgi_param XDEBUG_TRIGGER 1; inside the existing PHP location block
    with open(nginx_conf_path, "r") as f:
        content = f.read()
    content = content.replace(
        "location ~ \\.php$ {",
        "location ~ \\.php$ {\n\t\tfastcgi_param XDEBUG_TRIGGER 1;",
    )
    with open(nginx_conf_path, "w") as f:
        f.write(content)
    # remove the #ddev-generated comment
    subprocess.run(
        [
            "sed",
            "-i",
            r"/#ddev-generated/d",
            nginx_conf_path,
        ]
    )

    # copy over the file to /etc/nginx/sites-enabled/nginx-site.conf
    subprocess.run(
        [
            "cp",
            nginx_conf_path,
            "/etc/nginx/sites-enabled/nginx-site.conf",
        ]
    )

    print("Nginx configuration updated.")

    # restart ddev nginx service ddev exec nginx -s reload
    subprocess.run(["nginx", "-s", "reload"])


update_nginx_config()
