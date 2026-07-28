import {
  Building2,
  Castle,
  CloudLightning,
  Droplets,
  Landmark,
  Map,
  Mountain,
  Sprout,
  TowerControl,
  Waves,
} from "lucide-react";

export const locationIcons: Record<string, typeof Map> = {
  roshar: Map,
  alethkar: Castle,
  azir: Landmark,
  "shattered-plains": Mountain,
  urithiru: TowerControl,
  shinovar: Sprout,
  "jah-keved": Mountain,
  purelake: Droplets,
  aimia: Waves,
  kharbranth: Building2,
  kholinar: Castle,
  "thaylen-city": Waves,
  highstorm: CloudLightning,
};
