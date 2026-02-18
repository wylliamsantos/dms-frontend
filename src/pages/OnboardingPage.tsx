import { Link } from 'react-router-dom';

export function OnboardingPage() {
  return (
    <section className="page-section">
      <header className="page-header">
        <h1>Onboarding inicial</h1>
        <p>
          Complete este fluxo guiado para deixar o tenant pronto sem suporte manual e chegar ao
          primeiro documento publicado.
        </p>
      </header>

      <div className="category-page__content" style={{ gap: '1rem' }}>
        <article className="card">
          <h2>1) Conferir acesso e papéis</h2>
          <p>
            Valide login do owner/admin e confirme que os perfis mínimos (owner, admin, reviewer,
            viewer) estão provisionados no tenant.
          </p>
        </article>

        <article className="card">
          <h2>2) Criar categorias base</h2>
          <p>Cadastre as categorias necessárias para iniciar a operação e o schema mínimo.</p>
          <Link to="/categories">Ir para gerenciamento de categorias</Link>
        </article>

        <article className="card">
          <h2>3) Publicar primeiro documento</h2>
          <p>
            Faça um upload inicial para validar ponta-a-ponta (ingestão, indexação e consulta).
          </p>
          <Link to="/documents/new">Ir para novo documento</Link>
        </article>

        <article className="card">
          <h2>4) Validar consulta</h2>
          <p>
            Após o upload, use a tela de consulta para confirmar recuperação do documento no tenant
            correto.
          </p>
          <Link to="/">Ir para consulta</Link>
        </article>
      </div>
    </section>
  );
}
