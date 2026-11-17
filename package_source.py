"""Create the shareable source archive. Run with Python 3 before npm run build."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
output=root/'public'/'downloads'/'AETHER_SOURCE.zip'
output.parent.mkdir(parents=True,exist_ok=True)
excluded={'node_modules','dist','.git','public','.openai','.env','test-results','playwright-report'}
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative=path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in relative.parts):continue
        if path.suffix in {'.log','.tsbuildinfo'}:continue
        archive.write(path,'AETHER/'+str(relative))
    if (root/'public/countries.geojson').exists():archive.write(root/'public/countries.geojson','AETHER/public/countries.geojson')
    for path in sorted((root/'public/history').glob('*')):
        if path.is_file():archive.write(path,'AETHER/public/history/'+path.name)
print(output)
