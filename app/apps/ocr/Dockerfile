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
