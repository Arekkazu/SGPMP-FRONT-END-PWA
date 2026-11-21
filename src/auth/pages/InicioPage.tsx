// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-20 | Arekkazu | INICIO SIGAB: portada pública en «/» para quien llega sin sesión |
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Calculator,
  Check,
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  CloudCheck,
  HeartPulse,
  House,
  Moon,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Sun,
  Thermometer,
  TrendingUp,
  WifiOff,
} from 'lucide-react';

import { Button } from '../../shared/design-system/Button';
import { Isotipo } from '../../shared/design-system/Isotipo';
import { SelectorIdioma } from '../../shared/design-system/SelectorIdioma';
import { useT } from '../../shared/i18n/useT';
import { THEME_MODE, aplicarTema, resolverTema, temaRecordado } from '../../shared/tema/tema';
import s from './InicioPage.module.css';

/**
 * La app instalada abre en «/» (start_url del manifest): quien ya la instaló no necesita
 * que se la presenten y va directo al inicio de sesión.
 */
export function esAppInstalada(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

const BOTON = 'ds-btn ds-btn--lg';

/**
 * Portada de SIGAB para quien llega sin sesión: qué hace el sistema y cómo entrar o
 * registrarse. Sin backend: el tema se guarda solo en el navegador (sin sesión no hay
 * preferencia que guardar) y el idioma usa el mismo selector del login.
 */
export function InicioPage() {
  const { t } = useT('auth');
  // Sin sesión nadie aplica el tema al arrancar: el recordado o, si no hay, el del sistema.
  const [oscuro, setOscuro] = useState(() => (temaRecordado() ?? resolverTema(THEME_MODE.SISTEMA)) === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
  }, [oscuro]);

  useEffect(() => {
    const anterior = document.title;
    document.title = t('inicio.titulo_pagina');
    return () => { document.title = anterior; };
  }, [t]);

  const alternarTema = () => {
    setOscuro(aplicarTema(oscuro ? THEME_MODE.CLARO : THEME_MODE.OSCURO) === 'dark');  // y lo recuerda
  };

  return (
    <div className={s.inicio}>
      <a className={s.saltar} href="#contenido-inicio">{t('inicio.saltar')}</a>

      <header className={s.encabezado}>
        <nav className={`${s.contenedor} ${s.nav}`} aria-label={t('inicio.nav_aria')}>
          <a className={s.marca} href="#contenido-inicio" aria-label={t('inicio.inicio_aria')}>
            <span className={s.isotipo}><Isotipo size={28} /></span>
            SIGAB
          </a>
          <div className={s.acciones}>
            <SelectorIdioma />
            <Button variant="ghost" size="md" onClick={alternarTema}
              aria-label={oscuro ? t('inicio.tema_claro') : t('inicio.tema_oscuro')}>
              {oscuro ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
            </Button>
            <Link className={`ds-btn ds-btn--primary ds-btn--md ${s.entrar}`} to="/login">{t('inicio.entrar')}</Link>
          </div>
        </nav>
      </header>

      <main id="contenido-inicio" tabIndex={-1}>
        <section className={s.portada} aria-labelledby="inicio-titulo">
          <div className={`${s.contenedor} ${s.portadaIn}`}>
            <div className={s.portadaTexto}>
              <span className={s.saludo}><i aria-hidden="true" />{t('inicio.saludo')}</span>
              <h1 id="inicio-titulo" className={s.titulo}>
                {t('inicio.titulo')} <em>{t('inicio.titulo_resalte')}</em>
              </h1>
              <p className={s.lead}>{t('inicio.lead')}</p>
              <div className={s.botones}>
                <Link className={`${BOTON} ds-btn--primary`} to="/registro">{t('inicio.crear_cuenta')}</Link>
                <Link className={`${BOTON} ds-btn--secondary`} to="/login">{t('inicio.ya_tengo_cuenta')}</Link>
              </div>
              <p className={s.nota}><Smartphone size={18} aria-hidden />{t('inicio.nota_instalar')}</p>
            </div>

            <div className={s.escena} role="img" aria-label={t('inicio.escena_aria')}>
              <span className={s.solDeco} aria-hidden="true" />
              <div className={s.celular} aria-hidden="true">
                <div className={s.pantalla}>
                  <div>
                    <div className={s.pHola}>{t('inicio.celular.hola')}</div>
                    <div className={s.pFinca}>{t('inicio.celular.finca')}</div>
                  </div>
                  <div className={s.pEstado}>
                    <CircleCheck size={26} />
                    <div>{t('inicio.celular.estado')}<b>{t('inicio.celular.estado_detalle')}</b></div>
                  </div>
                  <div className={s.pFila}>
                    <div className={s.pDato}><small>{t('inicio.celular.animales')}</small><strong>128</strong></div>
                    <div className={s.pDato}><small>{t('inicio.celular.corral')}</small><strong>{t('inicio.celular.temperatura')}</strong></div>
                  </div>
                  <div className={s.pLista}>
                    <div className={s.pItem}><span className={`${s.pIco} ${s.verde}`}><ShieldCheck size={18} /></span>{t('inicio.celular.vacunas')}</div>
                    <div className={s.pItem}><span className={`${s.pIco} ${s.amarillo}`}><Thermometer size={18} /></span>{t('inicio.celular.calor')}</div>
                    <div className={s.pItem}><span className={`${s.pIco} ${s.verde}`}><TrendingUp size={18} /></span>{t('inicio.celular.peso')}</div>
                  </div>
                </div>
              </div>
              <div className={`${s.aviso} ${s.aviso1}`} aria-hidden="true">
                <span className={`${s.ico} ${s.amarillo}`}><Bell size={20} /></span>
                <div><strong>{t('inicio.aviso_calor_titulo')}</strong><span>{t('inicio.aviso_calor_detalle')}</span></div>
              </div>
              <div className={`${s.aviso} ${s.aviso2}`} aria-hidden="true">
                <span className={`${s.ico} ${s.verde}`}><CloudCheck size={20} /></span>
                <div><strong>{t('inicio.aviso_senal_titulo')}</strong><span>{t('inicio.aviso_senal_detalle')}</span></div>
              </div>
            </div>
          </div>
          <svg className={s.lomas} viewBox="0 0 1440 180" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className={s.loma1} d="M0 90 C 200 30, 380 40, 560 80 S 900 140, 1120 70 S 1360 40, 1440 60 V180 H0 Z" />
            <path className={s.loma2} d="M0 130 C 240 80, 440 100, 640 125 S 1000 160, 1220 110 S 1400 100, 1440 110 V180 H0 Z" />
            <path className={s.loma3} d="M0 165 C 300 135, 620 150, 900 160 S 1300 150, 1440 145 V180 H0 Z" />
          </svg>
        </section>

        <section className={`${s.contenedor} ${s.seccion}`} aria-labelledby="inicio-beneficios">
          <div className={s.tituloSeccion}>
            <span className={s.antetitulo}>{t('inicio.beneficios.antetitulo')}</span>
            <h2 id="inicio-beneficios">{t('inicio.beneficios.titulo')}</h2>
          </div>
          <div className={s.rejilla}>
            {([
              ['animal', ClipboardList, s.verde],
              ['avisos', Bell, s.amarillo],
              ['salud', HeartPulse, s.rojo],
              ['cuentas', CircleDollarSign, s.verde],
            ] as const).map(([clave, Icono, tono]) => (
              <article key={clave} className={s.tarjeta}>
                <span className={`${s.icoGrande} ${tono}`} aria-hidden="true"><Icono size={30} /></span>
                <h3>{t(`inicio.beneficios.${clave}_titulo`)}</h3>
                <p>{t(`inicio.beneficios.${clave}_detalle`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.banda} aria-labelledby="inicio-campo">
          <div className={`${s.contenedor} ${s.seccion} ${s.campo}`}>
            <div className={s.campoTexto}>
              <span className={s.antetitulo}>{t('inicio.campo.antetitulo')}</span>
              <h2 id="inicio-campo">{t('inicio.campo.titulo')}</h2>
              <p>{t('inicio.campo.texto')}</p>
              <ul className={s.chulos}>
                {(['celular_y_computador', 'botones', 'modo_oscuro'] as const).map((clave) => (
                  <li key={clave}><span className={s.chulo} aria-hidden="true"><Check size={16} strokeWidth={3} /></span>{t(`inicio.campo.${clave}`)}</li>
                ))}
              </ul>
            </div>
            <div className={s.senal} aria-hidden="true">
              <div className={s.estadoCard}>
                <span className={`${s.pill} ${s.amarillo}`}><WifiOff size={14} />{t('inicio.campo.sin_senal')}</span>
                <strong>{t('inicio.campo.pesaje')}</strong>
                <span>{t('inicio.campo.guardado')}</span>
              </div>
              <div className={s.estadoCard}>
                <span className={`${s.pill} ${s.verde}`}><Check size={14} />{t('inicio.campo.enviado')}</span>
                <strong>{t('inicio.campo.pesaje')}</strong>
                <span>{t('inicio.campo.en_la_finca')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${s.contenedor} ${s.seccion}`} aria-labelledby="inicio-personas">
          <div className={s.tituloSeccion}>
            <span className={s.antetitulo}>{t('inicio.personas.antetitulo')}</span>
            <h2 id="inicio-personas">{t('inicio.personas.titulo')}</h2>
            <p>{t('inicio.personas.texto')}</p>
          </div>
          <div className={s.rejilla}>
            {([
              ['dueno', House, s.verde],
              ['veterinario', Stethoscope, s.rojo],
              ['contador', Calculator, s.amarillo],
            ] as const).map(([clave, Icono, tono]) => (
              <article key={clave} className={s.tarjeta}>
                <span className={`${s.avatar} ${tono}`} aria-hidden="true"><Icono size={32} /></span>
                <h3>{t(`inicio.personas.${clave}_titulo`)}</h3>
                <p className={s.cita}>{t(`inicio.personas.${clave}_pregunta`)}</p>
                <p>{t(`inicio.personas.${clave}_detalle`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${s.contenedor} ${s.finalSeccion}`} aria-labelledby="inicio-final">
          <div className={s.final}>
            <span className={s.finalDeco} aria-hidden="true" />
            <h2 id="inicio-final">{t('inicio.final.titulo')}</h2>
            <p>{t('inicio.final.texto')}</p>
            <div className={`${s.botones} ${s.botonesCentro}`}>
              <Link className={`${BOTON} ds-btn--primary`} to="/registro">{t('inicio.crear_cuenta')}</Link>
              <Link className={`${BOTON} ds-btn--secondary`} to="/login">{t('inicio.ya_tengo_cuenta')}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={`${s.contenedor} ${s.pie}`}>
        <span>{t('inicio.pie_sistema')}</span>
        <span>{t('inicio.pie_universidad')}</span>
      </footer>
    </div>
  );
}
