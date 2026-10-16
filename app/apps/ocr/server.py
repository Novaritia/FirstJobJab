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
