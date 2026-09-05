import json
import shutil
import subprocess
import zipfile
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
pack = root / 'wnc-image-pack-20260905'
items = json.loads((pack / 'manifest.json').read_text())
assert len(items) == 16
for item in items:
    source = Path(item['source'])
    original = pack / 'originals' / (item['name'] + '.png')
    web = pack / 'images' / (item['name'] + '.jpg')
    original.parent.mkdir(parents=True, exist_ok=True)
    web.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, original)
    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '88', str(original), '--out', str(web)], check=True, capture_output=True)
    with Image.open(original) as im:
        item['width'], item['height'] = im.size
        im.verify()
    with Image.open(web) as im:
        im.verify()
    item['original'] = str(original.relative_to(pack))
    item['web'] = str(web.relative_to(pack))
(pack / 'manifest.json').write_text(json.dumps(items, ensure_ascii=False, indent=2))
zip_path = root / 'wnc-images-20260905.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(pack.rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            archive.write(path, path.relative_to(root))
with zipfile.ZipFile(zip_path) as archive:
    assert archive.testzip() is None
    assert len([n for n in archive.namelist() if n.endswith('.jpg')]) == 16
    assert len([n for n in archive.namelist() if n.endswith('.png')]) == 16
print(json.dumps({'zip': str(zip_path), 'bytes': zip_path.stat().st_size, 'images': [{'name': i['name'], 'size': [i['width'], i['height']]} for i in items]}, ensure_ascii=False))
