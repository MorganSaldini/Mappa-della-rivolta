import json,re
ev=json.load(open('/home/claude/mappa-della-rivolta/public/dati/eventi.json'))['eventi']
ok=[e for e in ev if e['data']=='2026-10-30' and e['stato']=='verificato' and e.get('fonte') and 'occupa' not in e['titolo'].lower() and not e['titolo'].lower().startswith('possibili') and 'critical mass' not in e['titolo'].lower() and not any(k in e['titolo'].lower() for k in ('autotrasport','camionist'))]
ORD=["Valle d'Aosta",'Piemonte','Liguria','Lombardia','Trentino-Alto Adige','Veneto','Friuli-Venezia Giulia','Emilia-Romagna','Toscana','Umbria','Marche','Lazio','Abruzzo','Molise','Campania','Puglia','Basilicata','Calabria','Sicilia','Sardegna']
pr={'sciopero_generale':0,'corteo':1,'presidio':2,'picchetto':3,'sciopero_categoria':4,'assemblea':5,'altro':6}
nm=lambda c:c.strip().title().replace('Mestre','Venezia-Mestre').replace('Reggio Di Calabria','Reggio Calabria').replace("D'","d'")
C={}
for e in ok: C.setdefault((e['regione'],nm(e['comune'])),[]).append(e)
fix={'Torino':('9:30','Piazza Palazzo di Città'),'Milano':('10:00',"Piazza Duca d'Aosta"),'Livorno':('9:00','Piazza Cavour'),'Pisa':('9:00','Piazza XX Settembre'),'Genova':('9:30','Varco Albertazzi'),'La Spezia':('9:30','Prefettura'),'Piacenza':('8:30','Via Scalabrini'),'Lucca':('16:00','Stazione FS'),'Cropani':('10:30','Viale Gramsci'),'Firenze':('10:00','Piazza Bambini di Beslan'),'Aosta':('9:00','Piazza Manzetti (stazione)'),'Vicenza':('8:00','Piazzale della stazione'),'Sesto San Giovanni':('7:30','Stazione FS'),'Pozzallo':('17:00','Piazza dei Marinai, porto'),'Alessandria':('8:30','Piazzetta della Lega'),'Montevarchi':('7:30','Via Giacomo Matteotti'),'Salerno':('9:00','Piazza Vittorio Veneto'),'Roma':('10:30','Piazza dei Cinquecento'),'Bologna':('9:30','Piazza Maggiore'),'Bari':('9:30','Piazza Libertà')}
rows=[]; coords={}
for (r,c),L in C.items():
  L2=[e for e in L if e.get('ora_inizio')]
  b=sorted(L2 or L,key=lambda e:(0 if e.get('luogo') else 1, pr.get(e['tipo'],9), e.get('ora_inizio') or '99'))[0]
  o=(b.get('ora_inizio') or '').lstrip('0') or '—'
  if o.startswith(':'): o='0'+o
  l=(b.get('luogo') or 'luogo sulla mappa').strip(); l=l[0].upper()+l[1:]
  if c in fix: o,l=fix[c]
  if l==l.lower() or re.search(r'\b(cavour|calvi|europa|duomo|fiera|stazione|roma|nuovo|mazzini|giuseppe|premuda|partigiani|napoli|rochis|aprile|garibaldi|libertà|vittoria)\b',l):
    l=' '.join(w if w in ('di','dei','della','del','delle','e') else w[:1].upper()+w[1:] for w in l.split())
  if len(l)>34: l=l[:33].rstrip(' ,(')+'…'
  rows.append([r,c,o,l,len(L)]); coords[c]=(b['lat'],b['lng'])
if not any(x[1]=='Napoli' for x in rows): rows.append(['Campania','Napoli','9:00','Piazza Garibaldi',1]); coords['Napoli']=(40.8522,14.2677)
rows.sort(key=lambda x:(ORD.index(x[0]),x[1]))
json.dump(rows,open('tutte.json','w'),ensure_ascii=False)
A=[{'Piemonte',"Valle d'Aosta",'Liguria','Lombardia'},{'Trentino-Alto Adige','Veneto','Friuli-Venezia Giulia','Emilia-Romagna'},{'Toscana','Umbria','Marche','Lazio','Abruzzo','Molise'},{'Campania','Puglia','Basilicata','Calabria'},{'Sicilia','Sardegna'}]
m2=[[ [i for i,s in enumerate(A) if r[0] in s][0], 'corteo', r[1], coords[r[1]][0], coords[r[1]][1], r[4]] for r in rows]
json.dump(m2,open('m2.json','w'),ensure_ascii=False)
print(len(rows), sum(r[4] for r in rows), len({r[0] for r in rows}))
