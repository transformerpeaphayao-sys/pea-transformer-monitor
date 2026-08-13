import io
from PIL import Image
from core import compress_image

# Create a dummy image
img = Image.new('RGB', (2000, 2000), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_bytes = img_byte_arr.getvalue()

print(f"Original size: {len(img_bytes)}")
compressed = compress_image(img_bytes)
print(f"Compressed size: {len(compressed)}")
