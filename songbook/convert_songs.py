import os
import re
from bs4 import BeautifulSoup

def convert_html_to_txt(html_file):
    with open(html_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    output_dir = "songs_markdown"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Find all song sections
    songs = soup.find_all('h1', class_='western')

    for song in songs:
        title = song.get_text(strip=True)
        if not title: continue

        # Clean filename
        filename = re.sub(r'[\\/*?:"<>|]', "", title) + ".txt"
        filepath = os.path.join(output_dir, filename)

        content = []
        content.append(f"Title: {title}")

        # Look for the author
        next_node = song.find_next_sibling()
        if next_node and next_node.name == 'p':
            author = next_node.get_text(strip=True)
            if author:
                content.append(f"Author: {author}")
            content.append("") # Empty line after header
            next_node = next_node.find_next_sibling()

        # Extract lyrics
        while next_node and next_node.name != 'h1':
            text = next_node.get_text(strip=True)
            if "Back to top" in text:
                break

            # Check for bold lines
            line_text = ""
            for child in next_node.children:
                if child.name == 'b':
                    line_text += f"**{child.get_text(strip=True)}**"
                else:
                    line_text += str(child.string) if child.string else ""

            final_line = line_text.strip()
            if final_line:
                content.append(final_line)
            else:
                content.append("")

            next_node = next_node.find_next_sibling()

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("\n".join(content))
        print(f"Created: {filename}")

if __name__ == "__main__":
    convert_html_to_txt('index.html')
    print("\nSuccess! All songs are in the 'songs_markdown' folder.")
