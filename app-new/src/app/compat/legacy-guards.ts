import { ActivatedRouteSnapshot, CanActivateFn, CanDeactivateFn, RouterStateSnapshot } from '@angular/router';
import { log } from '../shared/lifecycle-log';
import { LegacyPage } from './legacy-page';

/** canDeactivate -> instance ionViewCanLeave() (the component instance exists at this point). */
export const legacyCanLeave: CanDeactivateFn<LegacyPage> = (component) =>
  component?.ionViewCanLeave?.() ?? true;

type LegacyPageCtor = {
  ionViewCanEnter?: (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => boolean | Promise<boolean>;
  name: string;
};

/** canActivate -> STATIC ionViewCanEnter(route, state): no component instance exists yet. */
export function legacyCanEnter(Page: LegacyPageCtor): CanActivateFn {
  return (route, state) => {
    // esbuild dev builds rename classes (e.g. _HomeCompatPage), so strip any leading underscores too.
    const pageName = Page.name.replace(/^_+/, '').replace(/CompatPage$|Page$/, '');
    log(pageName, 'ionic-compat', 'ionViewCanEnter', 'static (no instance exists yet)');
    return Page.ionViewCanEnter ? Page.ionViewCanEnter(route, state) : true;
  };
}
