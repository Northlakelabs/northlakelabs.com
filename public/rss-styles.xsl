<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:dc="http://purl.org/dc/elements/1.1/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            background: #141C24;
            color: #9CA3A8;
            padding: 2rem 1rem;
            max-width: 760px;
            margin: 0 auto;
          }
          .badge {
            display: inline-block;
            background: #E8A826;
            color: #141C24;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.15rem 0.5rem;
            border-radius: 2px;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
          }
          h1 { color: #E8A826; font-size: 1.5rem; margin-bottom: 0.25rem; }
          .subtitle { color: #9CA3A8; font-size: 0.85rem; margin-bottom: 2rem; line-height: 1.5; }
          .feed-url { color: #6B8FAD; font-size: 0.8rem; margin-bottom: 2rem; }
          .feed-url a { color: #6B8FAD; }
          .post {
            border-left: 2px solid #D4813F;
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
          }
          .post-title a {
            color: #E8A826;
            text-decoration: none;
            font-size: 1rem;
            font-weight: 700;
          }
          .post-title a:hover { text-decoration: underline; }
          .post-date { color: #6B8FAD; font-size: 0.75rem; margin: 0.25rem 0; }
          .post-desc { color: #9CA3A8; font-size: 0.85rem; line-height: 1.6; margin-top: 0.4rem; }
          .instructions {
            background: #222F3E;
            border: 1px solid #2a3a4e;
            padding: 1rem;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-bottom: 2rem;
          }
          .instructions p { margin-bottom: 0.4rem; }
          code { color: #E8A826; background: #141C24; padding: 0.1em 0.3em; border-radius: 2px; }
        </style>
      </head>
      <body>
        <div class="badge">RSS FEED</div>
        <h1><xsl:value-of select="/rss/channel/title"/></h1>
        <p class="subtitle"><xsl:value-of select="/rss/channel/description"/></p>
        <div class="instructions">
          <p>This is an RSS feed. Subscribe by copying the URL into your reader:</p>
          <p><code><xsl:value-of select="/rss/channel/link"/>/max/rss.xml</code></p>
        </div>
        <xsl:for-each select="/rss/channel/item">
          <div class="post">
            <div class="post-title">
              <a hreflang="en">
                <xsl:attribute name="href">
                  <xsl:value-of select="link"/>
                </xsl:attribute>
                <xsl:value-of select="title"/>
              </a>
            </div>
            <div class="post-date"><xsl:value-of select="pubDate"/></div>
            <div class="post-desc"><xsl:value-of select="description"/></div>
          </div>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
