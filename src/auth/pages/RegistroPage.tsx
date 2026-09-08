import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRegistro } from '../hooks/useRegistro';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { PasswordStrength } from '../../shared/design-system/PasswordStrength';
import { Alert } from '../../shared/design-system/Alert';
import { RecaptchaField } from '../components/RecaptchaField';
import { recaptchaConfigured, recaptchaSiteKey } from '../config/recaptcha';
import type { UsuarioCreateDTO } from '../types';
import './AuthPages.css';

const NAME_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;
const PW_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!*])[A-Za-z\d@#$%^&+=!*]{8,}$/;

interface Step1Fields {
  tipo_identificacion: string;
  numero_identificacion: string;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  telefono: string;
  direccion: string;
}

interface Step2Fields {
  correo_electronico: string;
  contrasena: string;
  confirmar_contrasena: string;
}

export function RegistroPage() {
  const { t } = useT('auth');
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<Step1Fields | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const { registrar, loading, error, success, online } = useRegistro();

  const form1 = useForm<Step1Fields>({ mode: 'onBlur' });
  const form2 = useForm<Step2Fields>({ mode: 'onBlur' });

  const pw = form2.watch('contrasena', '');

  const onStep1Submit = (data: Step1Fields) => {
    setStep1Data(data);
    setStep(2);
    setCaptchaToken(null);
    setCaptchaError(null);
    setCaptchaResetKey((key) => key + 1);
    form2.reset();
  };

  const onStep2Submit = async (data: Step2Fields) => {
    if (!step1Data) return;
    if (!captchaToken) {
      setCaptchaError(t('registropage.completa_la_verificacion'));
      return;
    }
    const dto: UsuarioCreateDTO = {
      correo_electronico: data.correo_electronico,
      contrasena: data.contrasena,
      confirmar_contrasena: data.confirmar_contrasena,
      nombre: step1Data.nombre,
      apellidos: step1Data.apellidos,
      tipo_identificacion: step1Data.tipo_identificacion,
      numero_identificacion: step1Data.numero_identificacion,
      fecha_nacimiento: step1Data.fecha_nacimiento,
      genero: step1Data.genero,
      telefono: step1Data.telefono || undefined,
      direccion: step1Data.direccion || undefined,
      captcha_token: captchaToken,
    };
    const registrado = await registrar(dto);
    if (!registrado) {
      setCaptchaToken(null);
      setCaptchaError(t('registropage.completa_nuevamente_la_verificacion'));
      setCaptchaResetKey((key) => key + 1);
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    if (token) setCaptchaError(null);
  };

  if (success) {
    return (
      <div className="auth-bg">
        <div className="auth-card auth-center">
          <div className="auth-success-icon">
            <CheckCircle size={28} color="var(--sem-success)" aria-hidden />
          </div>
          <h1 className="auth-title">{t('registropage.cuenta_creada')}</h1>
          <Alert
            variant="success"
            title={t('registropage.revisa_tu_correo')}
            description={t('registropage.hemos_enviado_un_enlace_de_activacion_a_tu')}
            className="auth-alert"
          />
          <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'center', marginTop: 'var(--s4)' }}>
            <Link to="/login" className="auth-link">{t('registropage.ir_a_iniciar_sesion')}</Link>
            <Link to="/reenviar-activacion" className="auth-link">{t('registropage.reenviar_correo_de_activacion')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M8 22C8 16 12 11 16 11C20 11 24 16 24 22" stroke="white" strokeWidth="2"/>
            <circle cx="12" cy="17" r="2" fill="white" opacity=".8"/>
            <circle cx="20" cy="17" r="2" fill="white" opacity=".8"/>
            <path d="M13 21C13 19.5 14.3 18.5 16 18.5C17.7 18.5 19 19.5 19 21" stroke="white" strokeWidth="1.5"/>
          </svg>
        </div>
        <h1 className="auth-title">{t('registropage.crear_cuenta_nueva')}</h1>
        <p className="auth-sub">
          {step === 1 ? t('registropage.paso_1_de_2') : t('registropage.paso_2_de_2')}
        </p>

        {/* Stepper */}
        <div className="auth-stepper" aria-label={t('registropage.progreso_de_registro')}>
          <div className={`auth-step ${step === 1 ? 'auth-step--active' : 'auth-step--done'}`}>
            <div className="auth-step__circle">{step === 1 ? '1' : '✓'}</div>
            <span className="auth-step__label">{t('registropage.datos_personales')}</span>
          </div>
          <div className="auth-step-line" role="presentation" />
          <div className={`auth-step ${step === 2 ? 'auth-step--active' : ''}`}>
            <div className="auth-step__circle">2</div>
            <span className="auth-step__label">{t('registropage.credenciales')}</span>
          </div>
        </div>

        {/* PASO 1 */}
        {step === 1 && (
          <form onSubmit={form1.handleSubmit(onStep1Submit)} noValidate>
            <div className="auth-form-grid">
              <div className="auth-field">
                <Select
                  label={t('registropage.tipo_de_identificacion')}
                  required
                  error={
                    form1.formState.errors.tipo_identificacion
                      ? t('registropage.selecciona_el_tipo_de_identificacion')
                      : undefined
                  }
                  {...form1.register('tipo_identificacion', { required: true })}
                >
                  <option value="CC">{t('registropage.cedula_de_ciudadania_cc')}</option>
                  <option value="CE">{t('registropage.cedula_de_extranjeria_ce')}</option>
                  <option value="Pasaporte">{t('registropage.pasaporte')}</option>
                </Select>
              </div>

              <div className="auth-field">
                <Input
                  label={t('registropage.numero_de_identificacion')}
                  required
                  placeholder="Ej. 1234567890"
                  maxLength={20}
                  error={form1.formState.errors.numero_identificacion?.message}
                  {...form1.register('numero_identificacion', {
                    required: t('registropage.el_numero_de_identificacion_es_obligatorio'),
                  })}
                />
              </div>

              <div className="auth-field">
                <Input
                  label={t('registropage.nombres')}
                  required
                  placeholder={t('registropage.solo_letras_y_n')}
                  error={form1.formState.errors.nombre?.message}
                  {...form1.register('nombre', {
                    required: t('registropage.el_nombre_es_obligatorio'),
                    pattern: { value: NAME_REGEX, message: t('registropage.solo_letras_espacios_y_caracteres_espanoles') },
                  })}
                />
              </div>

              <div className="auth-field">
                <Input
                  label={t('registropage.apellidos')}
                  required
                  placeholder={t('registropage.solo_letras_y_n')}
                  error={form1.formState.errors.apellidos?.message}
                  {...form1.register('apellidos', {
                    required: t('registropage.los_apellidos_son_obligatorios'),
                    pattern: { value: NAME_REGEX, message: t('registropage.solo_letras_espacios_y_caracteres_espanoles') },
                  })}
                />
              </div>

              <div className="auth-field">
                <Input
                  label={t('registropage.fecha_de_nacimiento')}
                  type="date"
                  required
                  error={form1.formState.errors.fecha_nacimiento?.message}
                  {...form1.register('fecha_nacimiento', {
                    required: t('registropage.la_fecha_de_nacimiento_es_obligatoria'),
                    validate: (v) => {
                      const birth = new Date(v);
                      const today = new Date();
                      let age = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                      return age >= 18 || t('validacion.debes_ser_mayor_de_18', { ns: 'common' });
                    },
                  })}
                />
              </div>

              <div className="auth-field">
                <Select
                  label={t('registropage.genero')}
                  required
                  error={
                    form1.formState.errors.genero
                      ? t('registropage.selecciona_el_genero')
                      : undefined
                  }
                  {...form1.register('genero', { required: true })}
                >
                  <option value="M">{t('registropage.masculino_m')}</option>
                  <option value="F">{t('registropage.femenino_f')}</option>
                  <option value="X">{t('registropage.no_binario_x')}</option>
                  <option value="T">{t('registropage.trans_t')}</option>
                </Select>
              </div>

              <div className="auth-field">
                <Input
                  label={t('registropage.telefono')}
                  type="tel"
                  placeholder="Ej. 3001234567"
                  maxLength={15}
                  hint={t('validacion.telefono_opcional', { ns: 'common' })}
                  error={form1.formState.errors.telefono?.message}
                  {...form1.register('telefono', {
                    pattern: { value: /^[0-9]{7,15}$/, message: t('registropage.telefono_invalido_solo_numeros_7_15_digitos') },
                  })}
                />
              </div>

              <div className="auth-field auth-col-full">
                <Input
                  label={t('registropage.direccion')}
                  placeholder={t('registropage.calle_numero_ciudad')}
                  maxLength={150}
                  {...form1.register('direccion')}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button type="button" variant="secondary" size="md">{t('registropage.ya_tienes_cuenta')}</Button>
              </Link>
              <Button type="submit" variant="primary" size="md">{t('registropage.continuar')}</Button>
            </div>
          </form>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <form onSubmit={form2.handleSubmit(onStep2Submit)} noValidate>
            {error && (
              <Alert
                variant="error"
                title={t('registropage.error_al_registrar')}
                description={error.message}
                className="auth-alert"
              />
            )}
            {!online && (
              <Alert
                variant="warning"
                title={t('registropage.sin_conexion')}
                description={t('registropage.el_registro_y_la_verificacion_captcha')}
                className="auth-alert"
              />
            )}

            <div className="auth-field">
              <Input
                label={t('registropage.correo_electronico')}
                type="email"
                required
                placeholder="usuario@dominio.com"
                error={form2.formState.errors.correo_electronico?.message}
                {...form2.register('correo_electronico', {
                  required: t('registropage.el_correo_es_obligatorio'),
                  pattern: { value: /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/, message: t('registropage.formato_de_correo_invalido') },
                })}
              />
            </div>

            <div className="auth-field">
              <Input
                label={t('registropage.contrasena')}
                type={showPw ? 'text' : 'password'}
                required
                ariaDescribedBy="registro-contrasena-fortaleza"
                error={form2.formState.errors.contrasena?.message}
                trailingIcon={showPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                onTrailingClick={() => setShowPw((v) => !v)}
                {...form2.register('contrasena', {
                  required: t('registropage.la_contrasena_es_obligatoria'),
                  pattern: { value: PW_REGEX, message: t('registropage.la_contrasena_no_cumple_los_requisitos_de') },
                })}
              />
              <PasswordStrength id="registro-contrasena-fortaleza" valor={pw} />
            </div>

            <div className="auth-field">
              <Input
                label={t('registropage.confirmar_contrasena')}
                type={showConfirmPw ? 'text' : 'password'}
                required
                error={form2.formState.errors.confirmar_contrasena?.message}
                trailingIcon={showConfirmPw ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                onTrailingClick={() => setShowConfirmPw((v) => !v)}
                {...form2.register('confirmar_contrasena', {
                  required: t('registropage.confirma_tu_contrasena'),
                  validate: (v) => v === form2.getValues('contrasena') || t('validacion.las_contrasenas_no_coinciden', { ns: 'common' }),
                })}
              />
            </div>

            {online && (
              <RecaptchaField
                key={captchaResetKey}
                siteKey={recaptchaSiteKey}
                error={captchaError}
                onTokenChange={handleCaptchaChange}
                onExpired={() => {
                  setCaptchaToken(null);
                  setCaptchaError(t('registropage.verificacion_expiro'));
                }}
                onErrored={() => {
                  setCaptchaToken(null);
                  setCaptchaError(t('registropage.error_cargando_recaptcha'));
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={() => setStep(1)}>{t('registropage.anterior')}</Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={!online || !recaptchaConfigured || !captchaToken}
              >{t('registropage.registrarse')}</Button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s3)' }}>{t('registropage.al_registrarte_aceptas_nuestros_terminos_y')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
