import {rolldown} from 'rolldown';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=await mkdtemp(join(tmpdir(),'quiet-tests-'));
try{const bundle=await rolldown({input:'tests/domain.test.js',platform:'node',external:['node:test','node:assert/strict']});const {output}=await bundle.generate({format:'esm'});const path=join(dir,'tests.mjs');await writeFile(path,output[0].code);await import(pathToFileURL(path));await bundle.close();}finally{await rm(dir,{recursive:true,force:true});}
