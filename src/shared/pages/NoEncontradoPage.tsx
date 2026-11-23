// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-21 | Arekkazu | PAGINA 404: dirección inexistente muestra «página no encontrada» en vez de la pantalla en blanco |
import React, { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

import { useAuth } from '../auth/useAuth';
import { Button } from '../design-system/Button';
import { Isotipo } from '../design-system/Isotipo';
import { useT } from '../i18n/useT';
import { THEME_MODE, aplicarTema, resolverTema, temaRecordado } from '../tema/tema';
import s from './NoEncontradoPage.module.css';

interface Props {
  /** Código que muestran el chip y el letrero; los textos salen de `no_encontrado.*`. */
  codigo?: number;
}

/**
 * Ruta comodín de `AppRoutes`. nginx manda toda dirección a index.html, así que sin esto
 * una ruta inexistente dejaba el `IonRouterOutlet` vacío. «Volver al inicio» va a «/»:
 * `RutaRaiz` ya decide entre el panel (con sesión) y la portada (sin sesión).
 */
export function NoEncontradoPage({ codigo = 404 }: Props) {
  const { t } = useT('common');
  const { token, sesionOffline, isBootstrapping } = useAuth();
  const { pathname, search } = useLocation();
  const history = useHistory();
  const conSesion = token !== null || sesionOffline;
  // Con sesión, el tema lo pone useTemaSesion; sin sesión, igual que la portada.
  const [oscuro, setOscuro] = useState(() => (temaRecordado() ?? resolverTema(THEME_MODE.SISTEMA)) === 'dark');
  // «Regresar» solo si la página anterior es de SIGAB: navegación dentro de la app o un enlace del mismo sitio.
  const puedeRegresar = history.action === 'PUSH' || document.referrer.startsWith(window.location.origin);

  useEffect(() => {
    if (!isBootstrapping && !conSesion) document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
  }, [oscuro, conSesion, isBootstrapping]);

  useEffect(() => {
    const anterior = document.title;
    document.title = t('no_encontrado.titulo_pagina');
    return () => { document.title = anterior; };
  }, [t]);

  if (isBootstrapping) return null;

  const alternarTema = () => {
    setOscuro(aplicarTema(oscuro ? THEME_MODE.CLARO : THEME_MODE.OSCURO) === 'dark');
  };

  return (
    <div className={s.pagina}>
      <header className={s.encabezado}>
        <nav className={`${s.contenedor} ${s.nav}`} aria-label={t('no_encontrado.nav_aria')}>
          <Link className={s.marca} to="/" aria-label={t('no_encontrado.inicio_aria')}>
            <span className={s.isotipo}><Isotipo size={28} /></span>
            SIGAB
          </Link>
          {!conSesion && (
            <Button variant="ghost" size="md" onClick={alternarTema}
              aria-label={oscuro ? t('no_encontrado.tema_claro') : t('no_encontrado.tema_oscuro')}>
              {oscuro ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
            </Button>
          )}
        </nav>
      </header>

      <main className={s.escenario}>
        <div className={`${s.contenedor} ${s.escenarioIn}`}>
          <div className={s.texto}>
            <span className={s.codigo}><i aria-hidden="true" />{t('no_encontrado.codigo', { codigo })}</span>
            <h1 className={s.titulo}>{t('no_encontrado.titulo')} <em>{t('no_encontrado.titulo_resalte')}</em></h1>
            <p className={s.lead}>{t('no_encontrado.lead')}</p>
            <div className={s.botones}>
              <Link className="ds-btn ds-btn--primary ds-btn--lg" to="/">{t('no_encontrado.volver_al_inicio')}</Link>
              {puedeRegresar && (
                <Button variant="secondary" size="lg" onClick={() => history.goBack()}>{t('no_encontrado.regresar')}</Button>
              )}
            </div>
            <p className={s.ruta}>{t('no_encontrado.direccion')} <code>{pathname + search}</code></p>
          </div>

          <div className={s.dibujo}>
            <svg viewBox="0 0 460 360" role="img" aria-label={t('no_encontrado.dibujo_aria', { codigo })} focusable="false">
              <circle className={s.sol} cx="390" cy="56" r="40" />
              <g className={s.madera} strokeWidth="8" strokeLinecap="round">
                <line x1="10" y1="250" x2="10" y2="318" />
                <line x1="70" y1="250" x2="70" y2="318" />
                <line x1="2" y1="268" x2="78" y2="268" strokeWidth="6" />
                <line x1="2" y1="292" x2="78" y2="292" strokeWidth="6" />
              </g>
              <rect className={s.poste} x="128" y="150" width="14" height="172" rx="5" />
              <g transform="rotate(-6 135 130)">
                <path className={s.letrero} d="M62 92 H198 L222 124 L198 156 H62 Z" strokeWidth="7" strokeLinejoin="round" />
                <text className={s.letreroTexto} x="128" y="133" textAnchor="middle" fontWeight="800" fontSize="40">{codigo}</text>
              </g>
              <g transform="rotate(5 135 196)">
                <path className={s.letrero} d="M210 182 H74 L52 206 L74 230 H210 Z" strokeWidth="6" strokeLinejoin="round" />
                <text className={s.letreroTexto} x="134" y="212" textAnchor="middle" fontWeight="700" fontSize="17">{t('no_encontrado.letrero')}</text>
              </g>
              <g className={s.vaca} transform="translate(62 0)">
                <path className={`${s.cola} ${s.trazo}`} d="M318 238 C 336 246, 340 266, 334 284" strokeWidth="5" fill="none" strokeLinecap="round" />
                <circle className={`${s.cola} ${s.mancha}`} cx="334" cy="288" r="6" />
                <rect x="226" y="276" width="14" height="44" rx="6" strokeWidth="3" />
                <rect x="252" y="278" width="14" height="42" rx="6" strokeWidth="3" />
                <rect x="284" y="278" width="14" height="42" rx="6" strokeWidth="3" />
                <rect x="306" y="276" width="14" height="44" rx="6" strokeWidth="3" />
                <rect x="214" y="222" width="112" height="68" rx="30" strokeWidth="3" />
                <path className={s.mancha} d="M248 228 c 14 -4 24 6 20 18 c -4 12 -22 12 -26 2 c -2 -8 0 -18 6 -20z" />
                <path className={s.mancha} d="M292 254 c 10 -2 18 6 14 16 c -4 8 -16 8 -20 0 c -2 -6 0 -14 6 -16z" />
                <ellipse className={s.hocico} cx="270" cy="292" rx="12" ry="7" strokeWidth="2.5" />
                <g transform="rotate(-12 214 222)">
                  <path className={s.trazo} d="M176 196 l -12 -10" strokeWidth="5" strokeLinecap="round" />
                  <path className={s.trazo} d="M210 192 l 10 -12" strokeWidth="5" strokeLinecap="round" />
                  <ellipse cx="166" cy="206" rx="14" ry="8" strokeWidth="3" />
                  <rect x="170" y="192" width="54" height="62" rx="24" strokeWidth="3" />
                  <rect className={s.hocico} x="166" y="232" width="62" height="34" rx="16" strokeWidth="3" />
                  <circle className={s.mancha} cx="184" cy="248" r="3.5" />
                  <circle className={s.mancha} cx="210" cy="248" r="3.5" />
                  <circle className={s.mancha} cx="186" cy="214" r="5" />
                  <circle className={s.mancha} cx="208" cy="214" r="5" />
                </g>
                <text className={s.pregunta} x="150" y="182" fontWeight="800" fontSize="34" transform="rotate(-10 150 182)">?</text>
              </g>
              <g className={s.pasto} strokeWidth="4" strokeLinecap="round">
                <path d="M96 322 l -4 -14 M102 322 l 2 -16 M108 322 l 6 -12" />
                <path d="M410 322 l -4 -12 M416 322 l 2 -15 M422 322 l 6 -11" />
              </g>
            </svg>
          </div>
        </div>

        <svg className={s.lomas} viewBox="0 0 1440 170" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className={s.loma1} d="M0 80 C 200 30, 380 40, 560 76 S 900 130, 1120 66 S 1360 36, 1440 56 V170 H0 Z" />
          <path className={s.loma2} d="M0 122 C 240 76, 440 96, 640 118 S 1000 150, 1220 104 S 1400 94, 1440 104 V170 H0 Z" />
          <path className={s.loma3} d="M0 156 C 300 128, 620 142, 900 152 S 1300 142, 1440 138 V170 H0 Z" />
        </svg>
      </main>

      <footer className={`${s.contenedor} ${s.pie}`}>
        <span>{t('no_encontrado.pie_sistema')}</span>
        <span>{t('no_encontrado.pie_ayuda')}</span>
      </footer>
    </div>
  );
}
