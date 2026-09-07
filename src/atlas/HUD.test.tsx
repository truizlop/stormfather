import {fireEvent,render,screen,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,it,expect} from 'vitest';
import {HUD} from './HUD';
import {rosharGazetteer} from '../world/gazetteer/catalog';
import {useAtlas} from './store';
afterEach(cleanup);
beforeEach(()=>useAtlas.setState({view:'atlas',placeId:'urithiru',exploreOpen:true,notesOpen:false,helpOpen:false,settingsOpen:false,playing:true,weather:'clear',stormFollowing:false,closeView:false,scenesOpen:false,sceneId:null,discovered:[]}));
it('searches destinations and opens a place with its street camera',()=>{render(<HUD/>);fireEvent.change(screen.getByRole('textbox',{name:'Search Roshar'}),{target:{value:'Kharbranth'}});fireEvent.click(screen.getByRole('button',{name:'Kharbranth Frostlands coast'}));expect(screen.getByRole('heading',{name:'Kharbranth'})).toBeInTheDocument();expect(useAtlas.getState().exploreOpen).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Street view'}));expect(useAtlas.getState().closeView).toBe(true);});
it('controls actual playback, speed, weather and layer state',()=>{render(<HUD/>);fireEvent.click(screen.getByRole('button',{name:'Pause simulation'}));expect(useAtlas.getState().playing).toBe(false);fireEvent.change(screen.getByRole('combobox',{name:'Simulation speed'}),{target:{value:'4'}});expect(useAtlas.getState().speed).toBe(4);fireEvent.click(screen.getByRole('button',{name:'Highstorm'}));expect(useAtlas.getState().weather).toBe('highstorm');fireEvent.click(screen.getByRole('button',{name:'Map and simulation layers'}));fireEvent.click(screen.getByRole('checkbox',{name:'People'}));expect(useAtlas.getState().people).toBe(false);});
it('explains an empty search without a dead control',()=>{render(<HUD/>);fireEvent.change(screen.getByRole('textbox',{name:'Search Roshar'}),{target:{value:'zzzzzzz'}});expect(screen.getByText(/No places match/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Clear search'}));expect(screen.getByRole('button',{name:'Urithiru Central mountains'})).toBeInTheDocument();});

it('finds canonical destination aliases',()=>{render(<HUD/>);fireEvent.change(screen.getByRole('textbox',{name:'Search Roshar'}),{target:{value:'Narak'}});expect(screen.getByRole('button',{name:'Shattered Plains Eastern Roshar'})).toBeInTheDocument();});
it('does not invent a location for an unknown gazetteer entry',()=>{const place=rosharGazetteer.find(p=>p.certainty==='unknown')!;useAtlas.getState().travel('kholinar');useAtlas.getState().set({exploreOpen:true});render(<HUD/>);fireEvent.change(screen.getByRole('textbox',{name:'Search Roshar'}),{target:{value:place.canonicalName}});fireEvent.click(screen.getByText(place.canonicalName,{exact:true}));expect(useAtlas.getState().view).toBe('atlas');expect(useAtlas.getState().focusPoint).toBeNull();expect(screen.getByText(/do not establish a reliable map position/)).toBeInTheDocument();});

it('opens the wildlife camera and restores the creature layer',()=>{useAtlas.getState().travel('shattered-plains');useAtlas.getState().set({creatures:false});render(<HUD/>);fireEvent.click(screen.getByRole('button',{name:'Wildlife'}));expect(useAtlas.getState().cameraCommand.type).toBe('wildlife');expect(useAtlas.getState().creatures).toBe(true);expect(screen.getByRole('button',{name:'Wildlife'})).toHaveAttribute('aria-pressed','true');fireEvent.click(screen.getByRole('button',{name:'Overview'}));expect(useAtlas.getState().cameraCommand.type).toBe('home');});

it('follows Radiants at Urithiru and restores their independent layer',()=>{
  useAtlas.getState().travel('urithiru');useAtlas.getState().set({radiants:false,people:false});
  render(<HUD/>);fireEvent.click(screen.getByRole('button',{name:'Radiants'}));
  expect(useAtlas.getState().cameraCommand.type).toBe('radiants');expect(useAtlas.getState().radiants).toBe(true);expect(useAtlas.getState().people).toBe(false);
});

it('launches every scene and exposes all ten order demonstrations',()=>{
  render(<HUD/>);
  fireEvent.click(screen.getByRole('button',{name:'Living Roshar scenes'}));
  fireEvent.click(screen.getByRole('button',{name:/04 A living guide/}));
  expect(useAtlas.getState().sceneId).toBe('radiant-arts');
  expect(useAtlas.getState().placeId).toBe('urithiru');
  expect(screen.getAllByRole('button',{name:/^Demonstrate /})).toHaveLength(10);
  fireEvent.change(screen.getByRole('combobox',{name:'Radiant order'}),{target:{value:'willshaper'}});
  expect(useAtlas.getState().orderId).toBe('willshaper');
  expect(useAtlas.getState().sceneClose).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'More scenes'}));
  fireEvent.click(screen.getByRole('button',{name:/03 Parshendi/}));
  expect(useAtlas.getState().sceneId).toBe('listener-village');
  expect(useAtlas.getState().placeId).toBe('shattered-plains');
  fireEvent.click(screen.getByRole('button',{name:'Leave scene'}));
  expect(useAtlas.getState().sceneId).toBeNull();
});
it('follows a curiosity hint without granting the discovery',()=>{
  render(<HUD/>);fireEvent.click(screen.getByRole('button',{name:'Living Roshar scenes'}));
  fireEvent.click(screen.getByRole('button',{name:/Curiosities/}));
  fireEvent.click(screen.getAllByRole('button',{name:/a curious detail/})[0]);
  expect(useAtlas.getState().cameraCommand.type).toBe('discovery');
  expect(useAtlas.getState().discovered).toEqual([]);
});

it('starts the storm camera from Scenes and clears it through the storm HUD',()=>{render(<HUD/>);fireEvent.click(screen.getByRole('button',{name:'Living Roshar scenes'}));fireEvent.click(screen.getByRole('button',{name:/Ride the highstorm/}));expect(useAtlas.getState()).toMatchObject({stormFollowing:true,weather:'highstorm',scenesOpen:false});expect(screen.getByRole('progressbar',{name:'Continental crossing'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Clear highstorm'}));expect(useAtlas.getState()).toMatchObject({stormFollowing:false,weather:'clear'});});
