-- La prima copia da Airtable ha letto i seriali dei kit come {"text": "..."}: toglie quelle righe sbagliate.
delete from public.devices where serial like 'TEXT%';
