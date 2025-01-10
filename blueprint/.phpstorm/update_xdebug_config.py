import os
import xml.etree.ElementTree as ET
import re
import configparser
from xml.dom import minidom

WORKSPACE_XML = ".idea/workspace.xml"
XDEBUG_INI = ".ddev/php/xdebug.ini"
DOCKER_COMPOSE_FULL = ".ddev/.ddev-docker-compose-full.yaml"


def get_xdebug_port():
    config = configparser.ConfigParser()
    if os.path.exists(XDEBUG_INI):
        config.read(XDEBUG_INI)
        if "xdebug" in config:
            print(f"Xdebug ini file found: {XDEBUG_INI}")
            port = None
            for section in config.sections():
                for key in config[section]:
                    if key == "xdebug.client_port":
                        port = config[section][key]
            return port
    return None


def get_ddev_hostname():
    if os.path.exists(DOCKER_COMPOSE_FULL):
        with open(DOCKER_COMPOSE_FULL, "r") as f:
            content = f.read()
            match = re.search(r"DDEV_HOSTNAME:\s*([^\s]+)", content)
            if match:
                return match.group(1)
    return None


def create_server_element(ddev_hostname):
    server = ET.Element("server")
    server.attrib["host"] = ddev_hostname
    server.attrib["name"] = ddev_hostname
    server.attrib["use_path_mappings"] = "true"

    path_mappings = ET.Element("path_mappings")

    mapping = ET.Element("mapping")
    mapping.attrib["local-root"] = "$PROJECT_DIR$"
    mapping.attrib["remote-root"] = "/var/www/html"
    path_mappings.append(mapping)

    server.append(path_mappings)

    return server


try:
    xdebug_port = get_xdebug_port()
    ddev_hostname = get_ddev_hostname()

    mode = "w"
    if os.path.exists(WORKSPACE_XML):

        tree = ET.parse(WORKSPACE_XML)
        root = tree.getroot()

        if xdebug_port:
            # Find and remove existing xdebug server elements
            for component in root.findall('.//component[@name="PhpDebugGeneral"]'):
                root.remove(component)

        for component in root.findall('.//component[@name="PhpServers"]'):
            root.remove(component)

        print("Existing .idea/workspace.xml found. Updating configuration...")
    else:
        # Create a new workspace.xml file
        print("No existing .idea/workspace.xml found. Creating new configuration...")
        if not os.path.exists(".idea"):
            os.makedirs(".idea")
        mode = "x"
        root = ET.Element("project", version="4")

    if xdebug_port:
        # Write to workspace.xml file
        php_debug_general_component = ET.Element("component")
        php_debug_general_component.attrib["name"] = "PhpDebugGeneral"
        php_debug_general_component.attrib[
            "ignore_connections_through_unregistered_servers"
        ] = "false"
        php_debug_general_component.attrib["listening_started"] = "false"
        php_debug_general_component.attrib["xdebug_debug_port"] = xdebug_port

        xdebug_debug_ports = ET.Element("xdebug_debug_ports", port=xdebug_port)
        php_debug_general_component.append(xdebug_debug_ports)

        root.append(php_debug_general_component)

    php_servers_component = ET.Element("component")
    php_servers_component.attrib["name"] = "PhpServers"
    servers = ET.Element("servers")

    app_server = create_server_element(ddev_hostname)
    servers.append(app_server)

    # Add additional servers here if needed

    php_servers_component.append(servers)

    root.append(php_servers_component)

    tree = ET.ElementTree(root)

    xml_str = ET.tostring(root, encoding="utf-8")

    parsed_xml = minidom.parseString(xml_str)
    pretty_xml = parsed_xml.toprettyxml(indent="  ")

    pretty_xml = re.sub(r"\n\s*\n", "\n", pretty_xml)

    with open(WORKSPACE_XML, mode, encoding="utf-8") as f:
        f.write(pretty_xml)

    print(f"Configuration written to {WORKSPACE_XML}")

except Exception as e:
    print(f"An error occurred: {e}")
