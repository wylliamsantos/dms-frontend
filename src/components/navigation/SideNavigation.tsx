import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';

import { LanguageSwitcher } from './LanguageSwitcher';

export function SideNavigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const isSearchActive =
    location.pathname === '/' ||
    (location.pathname.startsWith('/documents/') && location.pathname !== '/documents/new');
  const isCategoryActive = location.pathname.startsWith('/categories');
  const isWorkflowActive = location.pathname.startsWith('/workflow');
  const canManageCategories = hasRole('ROLE_ADMIN');

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
      {canManageCategories ? (
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
            <li>
              <NavLink
                to="/workflow/pending"
                className={({ isActive }) => (isActive || isWorkflowActive ? 'active' : undefined)}
              >
                Pendências
              </NavLink>
            </li>
          </ul>
        </div>
      ) : null}
      <div className="side-nav__section">
        <span className="side-nav__label">{t('language.label')}</span>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
