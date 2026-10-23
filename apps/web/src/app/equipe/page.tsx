import { colaboradores, initials } from "@/lib/equipe";

export default function EquipePage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Equipe</p>
          <h1 className="page-title">
            Feito com <span className="heart">♥</span> por
          </h1>
          <p className="page-subtitle">
            As pessoas do grupo que construíram o verdia.
          </p>
        </div>
      </div>
      <ul className="equipe-grid">
        {colaboradores.map(({ name, linkedin }) => (
          <li key={linkedin}>
            <a
              className="card equipe-card"
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="equipe-avatar" aria-hidden="true">
                {initials(name)}
              </span>
              <span className="equipe-info">
                <span className="equipe-name">{name}</span>
                <span className="equipe-link">LinkedIn ↗</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
