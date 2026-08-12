"""
Kaggle Notebook: 百度 Unlimited-OCR 古籍掃描 PDF 批次 OCR
==========================================================
Accelerator: GPU T4 x2 (32GB VRAM)
Runtime: ~12s/page (model load ~30s first time)

使用方式：
1. 建立 Kaggle Notebook
2. Settings → Accelerator → GPU T4 x2
3. Settings → Internet → On
4. 貼上此 code
5. Upload PDF → Run → Download results
"""

import os
import gc
import time
import torch
import fitz  # PyMuPDF
from transformers import AutoModel, AutoTokenizer

os.environ['PYTORCH_ALLOC_CONF'] = 'expandable_segments:True'

# ============================================================
# CONFIG — 改這裡
# ============================================================
PDF_FILENAME = "ziwei_quanshu_ming.pdf"   # ← 你的 PDF 檔名
PDF_PATH = f"/kaggle/working/{PDF_FILENAME}"  # 上傳到 working 目錄
START_PAGE = None   # 從第幾頁開始（0-indexed），None = 從頭
END_PAGE = None     # 到第幾頁結束（不含），None = 到尾

# ============================================================
# 1. Load model
# ============================================================
MODEL_NAME = "baidu/Unlimited-OCR"

print("📦 Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

print("📦 Loading model (T4 x2, auto device map)...")
model = AutoModel.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True,
    use_safetensors=True,
    dtype=torch.bfloat16,
    device_map="auto",
)
model = model.eval()

for i in range(torch.cuda.device_count()):
    mem = torch.cuda.memory_allocated(i) / 1024**3
    print(f"  GPU {i}: {mem:.1f} GB allocated")

# ============================================================
# 2. PDF → Images
# ============================================================
doc = fitz.open(PDF_PATH)
print(f"📄 PDF: {doc.page_count} pages")

start = START_PAGE or 0
end = END_PAGE or doc.page_count
pages = list(range(start, end))
print(f"📋 Will OCR pages {start+1}–{end} ({len(pages)} pages)")

IMG_DIR = "/kaggle/working/ocr_input"
os.makedirs(IMG_DIR, exist_ok=True)

for pg in pages:
    page = doc[pg]
    mat = fitz.Matrix(300/72, 300/72)
    pix = page.get_pixmap(matrix=mat)
    pix.save(f"{IMG_DIR}/page_{pg+1:04d}.png")

doc.close()
print(f"✅ Exported {len(pages)} pages")

# ============================================================
# 3. Run OCR
# ============================================================
def free_memory():
    gc.collect()
    torch.cuda.empty_cache()
    torch.cuda.synchronize()

OUTPUT_DIR = "/kaggle/working/ocr_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

OCR_PARAMS = dict(
    prompt='<image>document parsing.',
    base_size=640,
    image_size=640,
    crop_mode=True,
    max_length=4096,
    no_repeat_ngram_size=35,
    ngram_window=128,
    save_results=True,
)

free_memory()

for i, pg in enumerate(pages):
    img_path = f"{IMG_DIR}/page_{pg+1:04d}.png"
    t0 = time.time()
    with torch.inference_mode():
        model.infer(tokenizer, image_file=img_path, output_path=OUTPUT_DIR, **OCR_PARAMS)
    elapsed = time.time() - t0
    free_memory()
    status = "✅" if elapsed < 30 else "⚠️ slow"
    print(f"  [{i+1}/{len(pages)}] Page {pg+1}: {elapsed:.1f}s {status}")

print(f"\n🎉 Done!")

# ============================================================
# 4. Pack results
# ============================================================
import zipfile

zip_path = "/kaggle/working/ocr_results.zip"
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(OUTPUT_DIR):
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, OUTPUT_DIR)
            zf.write(full, arcname)

print(f"📦 {zip_path} ({os.path.getsize(zip_path)/1024/1024:.1f} MB)")
print("右鍵 ocr_results.zip → Download")
