# -*- coding: utf-8 -*-
# This script downloads all necessary depencies and packs them up with `index.py`
# into `pyncmd.zip`. which can then be directly be uploaded to Tecent SCF via SCF Console
# 
# The dependecies used here are all platform-agnostic. No matter what machines the packages
# are downloaded from, they can be run without any issues.
import pip,zipfile,os
print('Downloading dependecies...')
pip.main(['install','pyncm','-t','./libs']),"Failed to download dependencies"
print('Packing up...')
f = zipfile.ZipFile("pyncmd.zip",'w')
def add_from_directiory(path,level=0):
    if os.path.isfile(path):
        print(f'|{"__"*level}','deflating :',path)
        return f.write(path,path)
    for item in os.listdir(path):
        localpath = os.path.join(path,item)        
        add_from_directiory(localpath,level + 1)    

os.chdir('./libs')
add_from_directiory('.')
os.chdir('..')
add_from_directiory('index.py')

print('All done. Ready to upload!')
