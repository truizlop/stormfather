import { Component, type ReactNode } from 'react';
import { Scene } from './Scene';
import { HUD } from './HUD';
class SceneBoundary extends Component<{children:ReactNode},{error:boolean}>{
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="scene-error"><h1>The atlas could not render</h1><p>Reload the page to rebuild the scene. A browser with WebGL is required.</p><button onClick={()=>window.location.reload()}>Reload atlas</button></div>:this.props.children;}
}
export function AtlasApp(){return <main className="atlas-v2"><SceneBoundary><Scene/><HUD/></SceneBoundary></main>;}
