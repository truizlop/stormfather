import { Component, lazy, Suspense, type ReactNode } from 'react';
import { LoadingStatus } from './loading/LoadingStatus';
import { useLoading } from './loading/state';
const Scene = lazy(() => import('./Scene').then(module => ({ default: module.Scene })));
import { HUD } from './HUD';
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{
  componentDidCatch(){useLoading.setState({atlas:null,place:null});}
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="scene-error"><h1>The atlas could not render</h1><p>Reload the page to rebuild the scene. A browser with WebGL is required.</p><button onClick={()=>window.location.reload()}>Reload atlas</button></div>:this.props.children;}
}
export function AtlasApp(){return <main className="atlas-v2"><SceneBoundary><Suspense fallback={null}><Scene/></Suspense></SceneBoundary><HUD/><LoadingStatus/></main>;}
