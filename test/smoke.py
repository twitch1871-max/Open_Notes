import urllib.request,urllib.error,http.cookiejar,json,uuid
base='http://127.0.0.1:5173'
def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
a,b=client(),client()
def req(c,path,method='GET',data=None):
 r=c.open(urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'},method=method));return json.load(r)
def denied(c,path,method='GET',data=None,status=401):
 try:req(c,path,method,data);raise AssertionError('access unexpectedly allowed')
 except urllib.error.HTTPError as e:assert e.code==status,e.code
email='test-'+uuid.uuid4().hex+'@example.org';pw='correct horse battery staple'
denied(a,'/api/notes')
req(a,'/api/register','POST',{'email':email,'password':pw})
req(a,'/api/notes/note-1','PUT',{'title':'Meine Idee','body':'# Hallo\nWelt'})
assert req(a,'/api/notes')[0]['body']=='# Hallo\nWelt'
req(b,'/api/login','POST',{'email':email,'password':pw})
assert req(b,'/api/notes')[0]['title']=='Meine Idee'
c=client();req(c,'/api/register','POST',{'email':'other-'+email,'password':pw});assert req(c,'/api/notes')==[]
req(c,'/api/notes/note-1','DELETE',{});assert len(req(a,'/api/notes'))==1
req(b,'/api/notes/note-1','DELETE',{});assert req(a,'/api/notes')==[]
req(a,'/api/logout','POST',{});denied(a,'/api/notes')
assert b'OpenNotes' in urllib.request.urlopen(base).read()
print('PASS: registration, login, two-client synchronization, user isolation, deletion, logout and HTML delivery')
