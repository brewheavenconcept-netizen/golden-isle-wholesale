import os
from PIL import Image

try:
    img_path = r"C:\Users\eddyr\.gemini\antigravity-ide\brain\b5cb8dd3-b6c8-4b2d-b604-c1bda5f923e0\media__1780477471125.png"
    if not os.path.exists(img_path):
        print("Logo file not found!")
        exit(1)
        
    img = Image.open(img_path)
    width, height = img.size
    print(f"Image size: {width}x{height}")
    
    # The gold oval crest is in the center-top. Let's crop it.
    # For a 1024x1024 image, the oval crest is roughly between:
    # x: 300 to 720
    # y: 100 to 600
    # Let's dynamically calculate based on image dimensions.
    left = int(width * 0.30)
    top = int(height * 0.10)
    right = int(width * 0.70)
    bottom = int(height * 0.60)
    
    cropped = img.crop((left, top, right, bottom))
    
    # Now let's remove the cream background.
    # Convert image to RGBA
    rgba = cropped.convert("RGBA")
    datas = rgba.getdata()
    
    new_data = []
    # The cream background is around RGB(250, 248, 244) or similar.
    # Let's filter out pixels that are very close to cream/white.
    for item in datas:
        # If pixel is very close to cream/white background, make it transparent
        r, g, b, a = item
        # Cream threshold: if all components are > 235 and r/g/b are close to each other
        if r > 235 and g > 232 and b > 225 and abs(r-g) < 12 and abs(g-b) < 12:
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append(item)
            
    rgba.putdata(new_data)
    
    # Save the result
    out_dir = r"C:\Project-mantaps-BEER\Golden-Isle-CMS\public"
    os.makedirs(out_dir, exist_ok=True)
    rgba.save(os.path.join(out_dir, "logo_crest.png"), "PNG")
    print("✅ Successfully cropped logo crest and removed background!")
    
except Exception as e:
    print(f"Error: {e}")
