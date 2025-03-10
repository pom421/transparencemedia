import React from "react"
import "./contribuer.module.css"

function CreditsPage() {
  return (
    <article id="about">
      <h1>Crédits</h1>
      <div className="text">
        <p>
          {"L'image de la page d'accueil est de "}
          <a target="_blank" href="https://500px.com/photo/48907472/untitled-by-timoth%C3%A9e-taupin" rel="noreferrer">
            Timothée Taupin
          </a>
          .
        </p>
        <p>
          La boussole a été dessinée par{" "}
          <a href="https://thenounproject.com/search/?q=compass&i=12941" target="_blank" rel="noreferrer">
            Stanislav Levin, RU
          </a>
          {", l'icône d'info par "}
          <a href="https://thenounproject.com/vityavorobyev/" target="_blank" rel="noreferrer">
            Viktor Vorobyev
          </a>
          {", l'icône de recherche par "}
          <a target="_blank" href="https://thenounproject.com/timur.minvaleev/" rel="noreferrer">
            Тимур Минвалеев
          </a>
          {", l'icône réseau par "}
          <a href="https://thenounproject.com/search/?q=network&i=739906" target="_blank" rel="noreferrer">
            Barracuda
          </a>
          , les icônes sur le revenu par{" "}
          <a href="https://thenounproject.com/search/?q=advert&i=749942" target="_blank" rel="noreferrer">
            {" "}
            Creative Stall
          </a>
          .
        </p>
      </div>
    </article>
  )
}

export default CreditsPage
