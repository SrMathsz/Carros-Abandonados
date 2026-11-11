# Carros Abandonados

Site para registrar carros abandonados na rua e entregar a lista à prefeitura.

- **Cidadão** (`/`): marca o carro no mapa, tira ou envia uma foto, informa placa, descrição e endereço.
- **Prefeitura** (`/prefeitura`): entra com e-mail e senha, vê os registros no mapa e na lista, abre a foto e muda a situação (pendente, vistoriado, recolhido).

Tecnologias: React + Vite, mapa Leaflet com OpenStreetMap, e Supabase para banco de dados (Postgres), login e armazenamento de fotos. Não usa Firebase nem precisa de app nativo: é um site que funciona no celular, inclusive com a câmera.

## Como rodar

Requisitos: Node 18 ou mais novo e uma conta gratuita em [supabase.com](https://supabase.com).

### 1. Criar o projeto no Supabase

1. Crie um projeto novo (guarde a senha do banco).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**. Isso cria as tabelas, as regras de acesso e o bucket privado de fotos.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.

### 2. Cadastrar quem da prefeitura pode acessar

1. Em **Authentication > Sign In / Providers > Email**, desligue a opção de permitir novos cadastros. Assim só entram contas criadas por você.
2. Em **Authentication > Users**, clique em **Add user** e crie o usuário com e-mail e senha.
3. No **SQL Editor**, autorize esse usuário como agente:

```sql
insert into public.agentes (user_id, nome)
select id, 'Nome do servidor' from auth.users where email = 'email@prefeitura.gov.br';
```

Repita para cada pessoa. Quem não estiver em `agentes` consegue entrar, mas não vê nenhum registro.

### 3. Rodar no seu computador

```bash
npm install
cp .env.example .env     # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Abra o endereço que o terminal mostrar. Para testar no celular, use o endereço de rede que o Vite exibe (a localização do aparelho só funciona em HTTPS ou em `localhost`, então para testar de verdade no celular o mais simples é publicar, como abaixo).

### 4. Publicar (Vercel)

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel, importe o repositório. O Vite é detectado sozinho.
3. Em **Environment Variables**, cadastre as mesmas variáveis do `.env`.
4. O arquivo `vercel.json` já cuida da rota `/prefeitura`.

## Como o código está organizado

| Arquivo | O que faz |
| --- | --- |
| `supabase/schema.sql` | Tabelas, permissões por coluna, regras de acesso (RLS), visão pública e bucket de fotos |
| `src/pages/Cidadao.jsx` | Mapa do cidadão, pino arrastável e botão de localização do aparelho |
| `src/components/FormularioCarro.jsx` | Formulário: foto reduzida, placa, descrição, endereço sugerido e envio |
| `src/pages/Prefeitura.jsx` | Login, lista, filtros, mapa com pinos por situação, foto e troca de situação |
| `src/components/MapaBase.jsx` | Mapa Leaflet e pinos em SVG |
| `src/lib/` | Placa, redução de imagem, endereço a partir das coordenadas e constantes |

## Como a privacidade foi pensada

- O cidadão **só consegue enviar**. Ele não lê registros, fotos nem placas de ninguém.
- Para evitar duplicados, o mapa do cidadão usa uma visão pública (`registros_publicos`) com apenas posição e situação, sem foto, placa ou endereço.
- As fotos ficam num bucket privado e a prefeitura as vê por links temporários de 1 hora.
- A foto é redesenhada antes do envio, o que remove metadados como o GPS embutido.
- A prefeitura só consegue alterar a coluna `status`.

## Contador de registros por placa

Quando várias pessoas registram o mesmo carro, a placa junta os registros em um só:

- **Cidadão:** o ponto cinza no mapa mostra o número de registros daquele carro.
- **Prefeitura:** aparece um cartão por carro, com o selo "N registros" e todas as fotos no detalhe. Mudar a situação vale para todos os registros do carro.
- Registros **sem placa** não são juntados, porque não há como saber se é o mesmo carro.
- Depois de **recolhido**, se a mesma placa aparecer de novo, vira um caso novo.
- O número conta registros, não pessoas diferentes: a mesma pessoa pode registrar duas vezes.

Se o banco já foi criado antes dessa versão, rode `supabase/migracao-contador.sql` uma vez no SQL Editor do Supabase.

## Antes de usar de verdade

Itens que o código não resolve sozinho:

- **Spam e trotes:** hoje qualquer pessoa pode enviar. Adicione um captcha (por exemplo Cloudflare Turnstile) e algum limite por aparelho ou IP, e deixe a equipe descartar registros falsos.
- **LGPD:** placa e foto são dados pessoais. Publique um aviso de privacidade, defina por quanto tempo guardar os registros e apague as fotos depois do recolhimento.
- **Processo legal:** o recolhimento exige vistoria e notificação do proprietário, e as regras variam por município. O site serve para triagem. O aviso na tela de detalhe é só um lembrete, ajuste o texto ao procedimento da sua prefeitura.
- **Mapa e endereços:** o mapa do OpenStreetMap e o serviço Nominatim têm política de uso moderado. Com muito acesso, troque por um provedor pago (MapTiler, Stadia, Mapbox).
- **Recolhido some do mapa público:** registros marcados como recolhidos deixam de aparecer para os cidadãos, mas continuam na lista da prefeitura.

## Ideias para a próxima etapa

- Exportar a lista em CSV ou planilha.
- Aviso por e-mail à prefeitura quando chegar um registro novo.
- Detectar registros duplicados próximos (mesma placa ou raio de 20 m).
- Instalar como aplicativo na tela inicial do celular (PWA).
- Histórico de mudanças de situação, com quem alterou e quando.
