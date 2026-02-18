import { NavLink, useLocation } from 'react-router-dom';

import { PERMISSIONS } from '@/auth/roles';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';

import { LanguageSwitcher } from './LanguageSwitcher';

export function SideNavigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const { hasAnyRole } = useAuth();
  const isSearchActive =
    location.pathname === '/' ||
    (location.pathname.startsWith('/documents/') && location.pathname !== '/documents/new');
  const isCategoryActive = location.pathname.startsWith('/categories');
  const isWorkflowActive = location.pathname.startsWith('/workflow');
  const canManageCategories = hasAnyRole([...PERMISSIONS.manageCategories]);
  const canReviewWorkflow = hasAnyRole([...PERMISSIONS.reviewWorkflow]);
  const canUploadDocument = hasAnyRole([...PERMISSIONS.uploadDocument]);

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
          {canUploadDocument ? (
            <li>
              <NavLink
                to="/documents/new"
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {t('navigation.newDocument')}
              </NavLink>
            </li>
          ) : null}
        </ul>
      </div>
      {canManageCategories || canReviewWorkflow ? (
        <div className="side-nav__section">
          <span className="side-nav__label">{t('navigation.categories')}</span>
          <ul className="side-nav__list">
            {canManageCategories ? (
              <li>
                <NavLink
                  to="/categories"
                  className={({ isActive }) => (isActive || isCategoryActive ? 'active' : undefined)}
                >
                  {t('navigation.manageCategories')}
                </NavLink>
              </li>
            ) : null}
            {canReviewWorkflow ? (
              <li>
                <NavLink
                  to="/workflow/pending"
                  className={({ isActive }) => (isActive || isWorkflowActive ? 'active' : undefined)}
                >
                  Pendências
                </NavLink>
              </li>
            ) : null}
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
