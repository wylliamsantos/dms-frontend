import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n';

import { LanguageSwitcher } from './LanguageSwitcher';

export function SideNavigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const isSearchActive =
    location.pathname === '/' ||
    (location.pathname.startsWith('/documents/') && location.pathname !== '/documents/new');
  const isCategoryActive = location.pathname.startsWith('/categories');

  return (
    <nav className="side-nav">
      <div className="side-nav__section">
        <span className="side-nav__label">{t('navigation.documents')}</span>
        <ul className="side-nav__list">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive || isSearchActive ? 'active' : undefined)}
            >
              {t('navigation.consult')}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/documents/new"
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {t('navigation.newDocument')}
            </NavLink>
          </li>
        </ul>
      </div>
      <div className="side-nav__section">
        <span className="side-nav__label">{t('navigation.categories')}</span>
        <ul className="side-nav__list">
          <li>
            <NavLink
              to="/categories"
              className={({ isActive }) => (isActive || isCategoryActive ? 'active' : undefined)}
            >
              {t('navigation.manageCategories')}
            </NavLink>
          </li>
        </ul>
      </div>
      <div className="side-nav__section">
        <span className="side-nav__label">{t('language.label')}</span>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
