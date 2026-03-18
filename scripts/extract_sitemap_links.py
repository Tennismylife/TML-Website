#!/usr/bin/env python3
"""Utility to extract <loc> URLs from a sitemap XML and write them to CSV.

Usage:
    python extract_sitemap_links.py <sitemap.xml> [output.csv]

If output.csv is not provided, the script will write to "links.csv" in the
current working directory.
"""
import csv
import sys
import xml.etree.ElementTree as ET


def extract_links(xml_path):
    """Parse the sitemap XML and return a list of URLs found in <loc> tags."""
    # sitemap namespace
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    tree = ET.parse(xml_path)
    root = tree.getroot()

    links = []
    for loc in root.findall(".//sm:loc", namespaces=ns):
        if loc.text:
            links.append(loc.text.strip())
    return links


def write_csv(urls, csv_path):
    """Write the list of URLs to a CSV file with a single header column 'url'."""
    with open(csv_path, "w", newline="", encoding="utf-8") as fp:
        writer = csv.writer(fp)
        writer.writerow(["url"])
        for url in urls:
            writer.writerow([url])


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_sitemap_links.py <sitemap.xml> [output.csv]")
        sys.exit(1)

    xml_path = sys.argv[1]
    csv_path = sys.argv[2] if len(sys.argv) > 2 else "links.csv"

    urls = extract_links(xml_path)
    write_csv(urls, csv_path)
    print(f"Extracted {len(urls)} links to '{csv_path}'")


if __name__ == "__main__":
    main()
