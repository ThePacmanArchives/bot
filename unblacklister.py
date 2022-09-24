import random
from re import L
import secrets
import sys
import lxml.etree
import os
import threading

file = sys.argv[1]

doc = lxml.etree.parse(file)
# watermark = lxml.etree.parse("watermark.xml") # new code


def uniqueId():
    print('Unique ID unpatched!')
    for el in doc.xpath("//UniqueId[@name='UniqueId']"):
        #print("Found EL with text " + el.text)
        el.text = f'Ha14sa{secrets.token_hex(110)}'
    doc.write(file)


def referentt():
    print('Referent unpatched!')
    for el in doc.xpath("//Item[@referent]"):
        string = ''.join(random.choice(
            'aBcDeFgHiJKlashiDSAuhasduaiuADSIU') for i in range(70))
        el.attrib['referent'] = f'{string}'
    doc.write(file)


def refvalue():
    print("RefValue unpatched")
    for el in doc.xpath("//Ref"):
        if el.text.startswith("RBX"):
            el.text = f'{secrets.token_hex(20)}'
    doc.write(file)


def enableHttp():
    for el in doc.xpath("//bool[@name='HttpEnabled']"):
        el.text = 'true'


def assetId():
    print('AssetId unpatched!')
    for el in doc.xpath("//SourceAssetId[@name='SourceAssetId']"):
        el.text = f'-{secrets.token_hex(20)}'
    doc.write(file)


def name():
    print('Name unpatched!')
    for el in doc.xpath("//string[@name]"):
        el.text = f'{secrets.token_hex(5)}'
    doc.write(file)


def decal():
    print('Decal ID randomized')
    for el in doc.xpath("//url"):
        el.text = f'http://www.roblox.com/asset/?id={random.randint(1,9999999999)}'
    doc.write(file)


def enableLoadStrings():
    print("LoadStrings unpatched")
    for el in doc.xpath("//bool[@name='LoadStringEnabled']"):
        el.text = 'true'
    doc.write(file)


def scriptGUID():
    print("Script GUID unpatched")
    for el in doc.xpath("//string[@name='ScriptGuid']"):
        el.text = f'{secrets.token_hex(20)}'
    doc.write(file)


if sys.argv[2] == "true":
    for el in doc.xpath("//BinaryString[@name='PhysicsGrid']"):
        el.text = ''
    for el in doc.xpath("//BinaryString[@name='SmoothGrid']"):
        el.text = ''
# sys.exit(0)
# script()
# decal()
enableHttp()
enableLoadStrings()
scriptGUID()
assetId()
refvalue()
# name()
# addWatermark()
# addAntiBan()
referentt()
uniqueId()
sys.exit(0)