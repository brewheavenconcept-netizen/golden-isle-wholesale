import os
import math
from PIL import Image

def process_and_save(img, crop_box, output_path, bg_color=(250, 248, 244)):
    # Crop
    cropped = img.crop(crop_box)
    rgba = cropped.convert("RGBA")
    datas = rgba.getdata()
    
    new_data = []
    bg_r, bg_g, bg_b = bg_color
    
    for item in datas:
        r, g, b, a = item
        
        # Euclidean distance
        dist = math.sqrt((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)
        
        # Feathering
        if dist < 22:
            new_data.append((255, 255, 255, 0)) # Fully transparent
        elif dist < 55:
            factor = (dist - 22) / (55 - 22)
            alpha = int(255 * factor)
            # Blend pixel with transparency
            new_data.append((r, g, b, alpha))
        else:
            new_data.append(item)
            
    rgba.putdata(new_data)
    
    # Trim transparent borders to get tight bounding box
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
        
    rgba.save(output_path, "PNG")
    print(f"Saved: {output_path}")

try:
    img_path = r"C:\Users\eddyr\.gemini\antigravity-ide\brain\b5cb8dd3-b6c8-4b2d-b604-c1bda5f923e0\media__1780477471125.png"
    if not os.path.exists(img_path):
        print("Logo file not found!")
        exit(1)
        
    img = Image.open(img_path)
    width, height = img.size
    print(f"Original image size: {width}x{height}")
    
    out_dir = r"C:\Project-mantaps-BEER\Golden-Isle-CMS\public"
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Crop Crest (G emblem)
    # y: 10% to 60%
    crest_box = (
        int(width * 0.32),
        int(height * 0.11),
        int(width * 0.68),
        int(height * 0.60)
    )
    process_and_save(img, crest_box, os.path.join(out_dir, "logo_crest.png"))
    
    # 2. Crop "GOLDEN ISLE" text
    # y: 58% to 72%
    brand_box = (
        int(width * 0.08),
        int(height * 0.58),
        int(width * 0.92),
        int(height * 0.72)
    )
    process_and_save(img, brand_box, os.path.join(out_dir, "logo_brand_text.png"))
    
    # 3. Crop "WHOLESALE" text
    # y: 72% to 79% (excluding the dashes on the sides if possible, or keeping them. Let's crop tight)
    # The word WHOLESALE is in the middle. x: 30% to 70%
    wholesale_box = (
        int(width * 0.28),
        int(height * 0.72),
        int(width * 0.72),
        int(height * 0.79)
    )
    process_and_save(img, wholesale_box, os.path.join(out_dir, "logo_wholesale_text.png"))
    
    print("✅ All logo components cropped and processed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
