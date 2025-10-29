import React, { useEffect, useState } from 'react';
import { hasValidCreds } from '../../config/aws-temp-creds.js';
import { TWINMAKER_CONFIG } from '../../config/aws-temp-creds.js';
import { getTwinMakerDataSource } from '../../services/twinMakerDataSource.js';

export function SceneViewer() {
  const [ViewerComp, setViewerComp] = useState(null);
  const [ready, setReady] = useState(false);
  const [props, setProps] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setStatus('Loading viewer module…');
        const mod = await import('@iot-app-kit/react-components');
        const Comp = mod?.SceneViewer || mod?.default?.SceneViewer || mod?.default;
        if (!Comp) throw new Error('SceneViewer export not found');
        if (mounted) {
          setViewerComp(() => Comp);
          setStatus('');
        }
      } catch (e) {
        if (mounted) setStatus('Viewer module not found locally. You can use the embedded iframe below.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!ViewerComp) return;
        if (!hasValidCreds()) return;
        const ds = await getTwinMakerDataSource();
        if (!mounted) return;
        setProps({
          query: ds.query,
          s3SceneLoader: ds.s3SceneLoader,
          sceneMetadataModule: ds.sceneMetadataModule,
          sceneComposerId: TWINMAKER_CONFIG.sceneId,
          workspaceId: TWINMAKER_CONFIG.workspaceId,
          viewport: { start: new Date(Date.now() - 60 * 60 * 1000), end: new Date() },
          cameraControlsEnabled: true,
          selectionMode: 'single',
          style: { width: '100%', height: '100%' },
        });
        setReady(true);
      } catch (e) {
        if (!mounted) return;
        setError(e);
      }
    })();
    return () => { mounted = false; };
  }, [ViewerComp, reloadTick]);

  const IframeFallback = (
    <iframe
      title="TwinMaker Viewer"
      src="/viewer/index.html"
      style={{ width: '100%', height: '100%', border: '0' }}
    />
  );

  if (!hasValidCreds()) {
    return (
      <div style={{display:'grid',placeItems:'center',height:'100%',opacity:.8,color:'#9aa3af',fontSize:14, gap:8}}>
        <div>Provide temporary AWS credentials in src/config/aws-temp-creds.js to load TwinMaker scene (DMR/dmr)</div>
        <button onClick={() => setReloadTick((t) => t + 1)} className="btn-outline" style={{padding:'6px 10px', borderRadius:999}}>Reload</button>
      </div>
    );
  }

  if (!ViewerComp) {
    return (
      <div style={{height:'100%', display:'grid', gridTemplateRows:'auto 1fr', gap:8}}>
        <div style={{display:'grid',placeItems:'center',opacity:.8,color:'#9aa3af',fontSize:13}}>{status || 'Viewer module not found.'}</div>
        {IframeFallback}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{display:'grid',placeItems:'center',height:'100%',color:'#fca5a5',fontSize:14}}>
        Failed to load TwinMaker scene. {String(error?.message || error)}
      </div>
    );
  }

  if (!ready || !props) {
    return (
      <div style={{display:'grid',placeItems:'center',height:'100%',opacity:.8,color:'#9aa3af',fontSize:14}}>
        Initializing TwinMaker scene…
      </div>
    );
  }

  const Comp = ViewerComp;
  return <Comp {...props} />;
}