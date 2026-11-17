from pathlib import Path
import urllib.request,json,concurrent.futures,math
root=Path(__file__).resolve().parent.parent
base='https://raw.githubusercontent.com/aourednik/historical-basemaps/master/'
def simplify(p,e=.13):
 if len(p)<4:return p
 a,b=p[0],p[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=dx*dx+dy*dy
 ds=[]
 for q in p[1:-1]:
  t=max(0,min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/den)) if den else 0
  ds.append((q[0]-a[0]-t*dx)**2+(q[1]-a[1]-t*dy)**2)
 m=max(ds,default=0)
 if m>e*e:
  k=ds.index(m)+1;return simplify(p[:k+1],e)[:-1]+simplify(p[k:],e)
 return [a,b]
def fetch(year):
 with urllib.request.urlopen(base+f'geojson/world_{year}.geojson',timeout=60) as r:d=json.load(r)
 for f in d['features']:
  g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
  for poly in polys:
   for i,ring in enumerate(poly):
    out=simplify(ring);poly[i]=[[round(x,3),round(y,3)] for x,y,*_ in (out if len(out)>=4 else ring)]
 (root/'public/history'/f'{year}.geojson').write_text(json.dumps(d,separators=(',',':')))
 return {'year':year,'features':len(d['features'])}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(fetch,[1800,1900,1914,1920,1938,1945,1960,1994,2000,2010]):print(result,flush=True)
with urllib.request.urlopen(base+'LICENSE',timeout=60) as r:(root/'public/history/LICENSE').write_bytes(r.read())
(root/'public/history/README.txt').write_text('Historical Basemaps by Andre Ourednik and contributors. https://github.com/aourednik/historical-basemaps\nGPL-3.0; simplified coordinates for browser use. Dataset is work in progress, boundaries are approximate. Economic figures are synthetic.\n')
