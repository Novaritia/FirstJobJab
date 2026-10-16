# OCR: engine choice + integration

Status 2026-10-16. Scope: Thai+English bank slips, passbook (สมุดบัญชี) photos, scanned PDF statements. Must be free, local, CPU-only. No Gemini.

**Pick: RapidOCR 3.10.0 (Python, onnxruntime) + PaddleOCR PP-OCRv5 Thai recognizer (`th_PP-OCRv5_rec_mobile`), run as a ~40-line FastAPI sidecar.** Apache-2.0, ~13 MB of models, ~0.6–1.2 s per image on a laptop CPU, returns text and boxes, so passbook rows can be rebuilt.

## Hands-on results (this repo's mock-data, Windows CPU)

| image | tesseract.js 5 tha+eng best_int (current `ocr.ts`, 1.5x upscale) | RapidOCR + th_PP-OCRv5 (cls off) | ppu-paddle-ocr 6.6.1 (Node, same Thai model) |
|---|---|---|---|
| slip_scb_food | date `12 ก.ุย. 2569` ✗, `ร้านปาแดง` ✗, junk line `ฆ 9 ฆ` | **all 13 lines exact** | name/amount ok; account line missing |
| slip_kbank_rent | date `1 กุย. 69 09:01 wu.` ✗, acct `20๐-%-%4821-%` ✗ | **all exact** (`1 ก.ย.69 09:01 น.`) | – |
| slip_kbank_mom | – | **all exact** | `28กย.6920:12น` (spaces/dots lost), bank-name line missing |
| SCANNED_KBANK p1 (2x render) | not run | ~190 lines; every date, time, amount and balance correct; 5x `ชำระ`→`ซำระ`; 2.2 s | – |
| passbook photo (synthetic: 4° skew, blur, JPEG q70) | rows ok; `CSH`→`6๐5ห`; last row split | **all 7 rows exact** after skew-aware row grouping (only teller `S000`→`5000`, header `ถอน`→`กอน`) | **lost 5 of 7 rows** (weaker detection preprocessing) |
| speed per slip | ~0.45 s | ~0.6–0.9 s | ~0.65 s |

Pitfalls found:
- RapidOCR's default text-direction classifier (`use_cls`) flips bold Thai lines 180°, which turns them into Latin junk such as `UN 000 :MBMIEESLษ`. Set `Global.use_cls: False`.
- The **default PP-OCRv6 model in RapidOCR 3.10 and ppu-paddle-ocr 6.x does NOT read Thai.** It output `SCB UA5NN` for `SCB ธนาคารไทยพาณิชย์`. You must select the v5 **th** recognizer.
- PP-OCR returns one box per text segment, not table rows. Group the boxes into rows with skew correction (the code below does this). Then decide withdrawal vs deposit from the change in balance, not from the column.

Caveat: the passbook test image is synthetic. Real camera photos (perspective, glare, dot-matrix print) will be worse for every engine. PaddleOCR's DB detector holds up much better than tesseract on such photos (that is well known, but I did not measure it here).

## Comparison

| engine | Thai evidence | license | CPU speed / size | integration from Node/Docker | layout / table | maintenance |
|---|---|---|---|---|---|---|
| **RapidOCR + PP-OCRv5 th** | measured above: best. Paddle reports 82.7% line acc. on its Thai set | Apache-2.0 (code + models) | ~1 s/img; det 4.8 MB + rec 7.9 MB | Python sidecar, `pip install`, 1 HTTP call | boxes → row grouping (DIY, 15 lines) | very active (3.10.0, models v3.10.0) |
| tesseract (current) | ok on clean text; mangles Thai month abbreviations, ป้า, masked accounts. `tessdata_best` (float) is a little better than `best_int` but ~2-3x slower, and both are 2017-era LSTM | Apache-2.0 | fastest, ~0.4 s; tha ~1-12 MB | already in place (tesseract.js) | PSM gives lines; weak on skewed photos | engine maintained, Thai models frozen |
| ppu-paddle-ocr (Node) | same Thai model, but worse det/line handling in my test | MIT (models Apache) | ~0.65 s | pure Node (`onnxruntime-node`), no sidecar | lines + boxes | active (6.6.1, 2026-10-08) |
| PaddleOCR 3.x (official, paddlepaddle) | same th model as RapidOCR | Apache-2.0 | heavier (paddlepaddle ~500 MB image) | Python sidecar, large | PP-Structure tables | active |
| EasyOCR `th` | older CRNN (2020); behind Paddle in public comparisons | Apache-2.0 | slow on CPU, torch ~1 GB+ | Python sidecar, heavy | boxes only | slow / sporadic |
| Surya | supports Thai; strong layout/table models | GPL-3 code; model weights under a restrictive license (commercial limits) | slow on CPU (meant for GPU), ~1 GB+ | Python, heavy | yes (layout, table rec) | active |
| docTR | no official Thai recognition vocab/model | Apache-2.0 | moderate, torch | Python | KIE/layout | active |
| Typhoon OCR 1.5 (scb10x, Qwen3-VL 2B) | Thai-specific, best on complex docs (Markdown/HTML tables) | Apache-2.0 (check checkpoint card) | 2B VLM: GPU in practice; CPU via llama.cpp/Ollama is tens of seconds per page, ~2-4 GB | Ollama/vLLM sidecar | outputs table HTML directly | active |
| ThaiTrOCR / other Thai GitHub models | line recognizer only (needs a separate detector); model-card claims beat EasyOCR/Tesseract | varies | transformer, slow on CPU | DIY pipeline | no | research-grade |

Typhoon OCR is the most accurate Thai option for passbooks *if a GPU exists*. On the CPU-only server it is too slow for a live demo. Keep it as a "future" slide.

## Integration recipe (target: demo by 13:00)

### 1. Sidecar `apps/ocr/server.py`
```python
import numpy as np, cv2
from fastapi import FastAPI, UploadFile
from rapidocr import RapidOCR, LangRec, OCRVersion, ModelType

engine = RapidOCR(params={
    "Global.use_cls": False,  # cls flips bold Thai lines 180deg -> Latin garbage; slips/passbooks are upright
    "Det.ocr_version": OCRVersion.PPOCRV5, "Det.model_type": ModelType.MOBILE,
    "Rec.ocr_version": OCRVersion.PPOCRV5, "Rec.model_type": ModelType.MOBILE, "Rec.lang_type": LangRec.TH,
})
app = FastAPI()

@app.get("/health")
def health(): return {"ok": True}

@app.post("/ocr")
async def ocr(file: UploadFile):
    img = cv2.imdecode(np.frombuffer(await file.read(), np.uint8), cv2.IMREAD_COLOR)
    if img is None: return {"lines": [], "boxes": []}
    r = engine(img)
    boxes = [{"text": t, "score": round(float(s), 3), "box": b.astype(int).tolist()}
             for t, s, b in zip(r.txts or [], r.scores or [], r.boxes if r.boxes is not None else [])]
    # group boxes into visual rows (passbook/statement tables). Skew-aware: estimate page tilt from box top edges,
    # then compare de-rotated y-centres; same row if within 0.6 * box height.
    slopes = sorted((b["box"][1][1] - b["box"][0][1]) / max(b["box"][1][0] - b["box"][0][0], 1) for b in boxes) or [0]
    k = slopes[len(slopes) // 2]
    def yc(b): return sum(p[1] - k * p[0] for p in b["box"]) / 4
    rows = []
    for bx in sorted(boxes, key=yc):
        h = max(p[1] for p in bx["box"]) - min(p[1] for p in bx["box"])
        if rows and abs(rows[-1]["yc"] - yc(bx)) < 0.6 * max(h, 1): rows[-1]["items"].append(bx)
        else: rows.append({"yc": yc(bx), "items": [bx]})
    lines = [" ".join(i["text"] for i in sorted(r["items"], key=lambda b: b["box"][0][0])) for r in rows]
    return {"lines": lines, "boxes": boxes}
```
(I tested exactly this file. It ran on Python 3.14 locally; use 3.12 in Docker.)

### 2. `apps/ocr/Dockerfile`
```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir rapidocr==3.10.0 onnxruntime==1.31.0 opencv-python-headless numpy \
    fastapi==0.143.2 uvicorn==0.54.0 python-multipart==0.0.32
WORKDIR /app
COPY server.py .
# bake models into the image (no runtime download): importing builds the engine, the first call fetches det+rec onnx
RUN python -c "import server, numpy as np; server.engine(np.full((64,256,3),255,np.uint8))"
EXPOSE 8765
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "1"]
```
Model URLs (RapidOCR downloads them automatically into `site-packages/rapidocr/models/`; listed here for offline mirroring):
- det: `https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv5/det/ch_PP-OCRv5_det_mobile.onnx` (4.8 MB)
- rec: `https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/onnx/PP-OCRv5/rec/th_PP-OCRv5_rec_mobile.onnx` (7.9 MB, dict embedded)
- dict (Paddle format, only if needed): `https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0/paddle/PP-OCRv5/rec/th_PP-OCRv5_rec_mobile/ppocrv5_th_dict.txt`

### 3. `docker-compose.yml`
```yaml
  ocr:
    build: ./apps/ocr
    restart: unless-stopped
    profiles: [full]
  api:
    environment:
      OCR_URL: http://ocr:8765   # add to existing api service
    depends_on: { db: { condition: service_healthy }, ocr: { condition: service_started } }
```
Local dev without Docker: `pip install rapidocr==3.10.0 onnxruntime fastapi uvicorn python-multipart && uvicorn server:app --port 8765`, then set `OCR_URL=http://localhost:8765`.

### 4. `apps/api/src/ocr.ts`: swap `ocrImage`, keep tesseract as fallback
```ts
export async function ocrImage(img: Buffer, scale = 1): Promise<{ lines: string[]; confidence: number }> {
  const url = process.env.OCR_URL;
  if (url) {
    try {
      const fd = new FormData();
      fd.append('file', new Blob([new Uint8Array(img)]), 'img');
      const r = await fetch(`${url}/ocr`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`ocr ${r.status}`);
      const j = (await r.json()) as { lines: string[]; boxes: { score: number }[] };
      const conf = j.boxes.length ? j.boxes.reduce((a, b) => a + b.score, 0) / j.boxes.length : 0;
      return { lines: j.lines.map(cleanThai).filter(Boolean), confidence: conf };
    } catch (e) { log.warn(`paddle ocr failed, falling back to tesseract: ${(e as Error).message}`); }
  }
  // ...existing tesseract body unchanged...
}
```
`readSlip`, `parseSlipText` and `ocrPages` need no other change, because the output shape (`lines[]`) is the same. No upscaling is needed for Paddle; `scale` is ignored on that path.

### Expected output (`POST /ocr`, slip_kbank_rent)
```json
{ "lines": ["K+ ธนาคารกสิกรไทย","โอนเงินสำเร็จ","1 ก.ย.69 09:01 น.","จาก","น.ส. สมหญิง ใจดี","XXx-x-x4821-x","ไปยัง",
            "นาย สมชาย เช่าดี","พร้อมเพย์ xxx-xxx-4521","เลขที่รายการ: 016244090105ATF07623","จำนวน: 7,500.00 บาท",
            "ค่าธรรมเนียม: 0.00 บาท","สแกนตรวจสอบสลิป"],
  "boxes": [{ "text": "K+ ธนาคารกสิกรไทย", "score": 0.996, "box": [[30,37],[402,34],[402,89],[31,92]] }, "..."] }
```
Passbook photo `lines`:
```
วันที รายการ กอน ฝาก คงเหลือ ผู้หา
01-09-69 CSH 15,000.00 15,250.00 T012
03-09-69 ATW 2,000.00 13,250.00 A931
```
Passbook row parse: `^(\d{2}-\d{2}-\d{2,4})\s+(\S+)\s+([\d,]+\.\d{2})(?:\s+([\d,]+\.\d{2}))?` gives date, code, amount and balance. Sign = `balance - prevBalance` (positive means deposit). Ignore the trailing teller id.

## Node-only alternative (no sidecar)
`pnpm --filter api add ppu-paddle-ocr@6.6.1 onnxruntime-node@1.30.0`, then
`new PaddleOcrService({ model: V5_THAI_MOBILE_MODEL })` → `await svc.recognize(arrayBuffer)` → `{ text, lines: [[{ text, box:{x,y,width,height}, confidence }]] }`.
This works, but in my test it lost 5 of 7 passbook rows and the spaces in Thai dates. It needs `onnxruntime-node` postinstall approval and downloads models to `~/.cache/ppu-paddle-ocr` (pre-warm in the Dockerfile with `PaddleOcrService.downloadModels()`). Use it only if a second container is not allowed.

## Sources
- PP-OCRv5 multilingual (th model, 82.68%, 7.5 MB): https://www.paddleocr.ai/latest/en/version3.x/algorithm/PP-OCRv5/PP-OCRv5_multi_languages.html
- RapidOCR model list: https://github.com/RapidAI/RapidOCR/blob/main/python/rapidocr/default_models.yaml
- ppu-paddle-ocr: https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr
- Typhoon OCR: https://github.com/scb-10x/typhoon-ocr, https://huggingface.co/scb10x/typhoon-ocr1.5-2b
- SEA OCR benchmark (EasyOCR/Tesseract on Thai): https://wing.comp.nus.edu.sg/project/benchmarking-and-improving-ocr-on-sea-languages
- Bench scripts: `%TEMP%\claude\...\scratchpad\ocr-bench\` (rt.py, tess.mjs, svc/server.py, node/t.mjs)
