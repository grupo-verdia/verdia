export type Colaborador = {
  name: string;
  linkedin: string;
};

/** Group members credited on /equipe, in the order the team listed them. */
export const colaboradores: readonly Colaborador[] = [
  {
    name: "Bruno Otávio da Cruz Carvalho",
    linkedin: "https://www.linkedin.com/in/bruno-otavio-carvalho/",
  },
  {
    name: "João Vitor Santana Silva Ribeiro",
    linkedin: "https://www.linkedin.com/in/jo%C3%A3o-vitor-ribeiro-762168355/",
  },
  {
    name: "Gustavo Cordeiro Braga",
    linkedin: "https://www.linkedin.com/in/gustavo-cordeiro-braga/",
  },
  {
    name: "Letícia Gabrielle Andrade Temóteo",
    linkedin: "https://www.linkedin.com/in/let%C3%ADcia-tem%C3%B3teo-07812130a/",
  },
  {
    name: "Stefanny Brum dos Santos",
    linkedin: "https://www.linkedin.com/in/stefanny-brum-53b4192ab/",
  },
];

/** First and last name initials for the avatar badge. */
export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}
