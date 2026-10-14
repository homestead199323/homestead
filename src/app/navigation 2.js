import {
  ClipboardList, Sprout, Package,
  TrendingUp, BookOpen, MoreHorizontal, PawPrint, Map, ShieldCheck,
} from "lucide-react";

/* ═══════════════════════════════════════════
   NAVIGATION CONFIG
   Used by App.jsx sidebar (NAV), mobile bottom tabs (BOTTOM_TABS),
   and mobile More drawer (MORE_ITEMS).
   ═══════════════════════════════════════════ */

export const NAV = [
  {id:"home",    l:"Farm",       E:Map,           group:"Daily"},
  {id:"tasks",   l:"Tasks",      E:ClipboardList, group:"Daily"},
  {id:"crops",   l:"Crops",      E:Sprout,        group:"Farm"},
  {id:"live",    l:"Animals",    E:PawPrint,      group:"Farm"},
  {id:"pantry",  l:"Pantry",     E:Package,       group:"Records"},
  {id:"fin",     l:"Financials", E:TrendingUp,    group:"Records"},
  {id:"manuals", l:"Manuals",    E:BookOpen,      group:"Reference"},
];

export const BOTTOM_TABS = [
  {id:"home",  l:"Farm",    E:Map},
  {id:"tasks", l:"Tasks",   E:ClipboardList},
  {id:"crops", l:"Crops",   E:Sprout},
  {id:"live",  l:"Animals", E:PawPrint},
  {id:"more",  l:"More",    E:MoreHorizontal},
];

/* Owner-only nav item — appended at runtime in App.jsx when the
   signed-in user is the owner (checkIsAdmin). Not in NAV/MORE_ITEMS so
   regular users never see it. */
export const ADMIN_NAV = {id:"admin", l:"Admin", E:ShieldCheck, group:"Owner"};

export const MORE_ITEMS = [
  {id:"pantry",  l:"Pantry",        E:Package},
  {id:"map",     l:"Farm Layout",   E:Map},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
];
