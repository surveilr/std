# Publishing Guide for @surveilr/bootstrap-sql

This guide covers the process for publishing the `@surveilr/bootstrap-sql` package to npm.

---

## 📋 Pre-Publishing Checklist

Before publishing a new version, ensure the following:

### 1. **Code Quality**
- [ ] All TypeScript files compile without errors
- [ ] Run `npm run lint` and fix any issues
- [ ] All tests pass (if applicable)
- [ ] Code follows project conventions

### 2. **Documentation**
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes new version notes
- [ ] All exported APIs are documented
- [ ] Examples are tested and working

### 3. **Dependencies**
- [ ] All dependencies are up to date
- [ ] Peer dependencies are correctly specified
- [ ] No unnecessary dependencies included

### 4. **Build Verification**
```bash
# Clean and rebuild
npm run build

# Verify dist/ contents
ls -la dist/

# Check that all expected files are present:
# - index.js, index.cjs, index.d.ts
# - models.js, models.cjs, models.d.ts
# - views.js, views.cjs, views.d.ts
```

### 5. **Package Contents**
```bash
# Preview what will be published
npm pack --dry-run

# Verify only necessary files are included:
# - dist/
# - README.md
# - package.json
```

---

## 🔢 Version Management

This package follows [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (x.0.0): Breaking changes to the schema or API
- **MINOR** (0.x.0): New tables, views, or backward-compatible features
- **PATCH** (0.0.x): Bug fixes, documentation updates, non-breaking improvements

### Update Version

```bash
# For patch releases (bug fixes)
npm version patch

# For minor releases (new features)
npm version minor

# For major releases (breaking changes)
npm version major

# Or manually edit package.json and update "version" field
```

---

## 📦 Publishing Process

### Step 1: Authenticate with npm

```bash
# Login to npm (first time only)
npm login

# Verify you're logged in
npm whoami
```

### Step 2: Build the Package

```bash
# Clean build
npm run build

# Verify TypeScript compilation
npm run lint
```

### Step 3: Test the Package Locally (Optional)

```bash
# Create a tarball
npm pack

# In another project, test the package
npm install /path/to/surveilr-bootstrap-sql-0.0.3.tgz
```

### Step 4: Publish to npm

```bash
# Publish to npm registry
npm publish --access public

# For scoped packages (@surveilr/*), --access public is required
```

### Step 5: Verify Publication

```bash
# Check on npm
npm view @surveilr/bootstrap-sql

# Install in a test project
npm install @surveilr/bootstrap-sql
```

### Step 6: Tag the Release in Git

```bash
# Create a git tag
git tag -a v0.0.3 -m "Release v0.0.3"

# Push the tag to GitHub
git push origin v0.0.3
```

---

## 🚀 Automated Publishing (CI/CD)

For automated publishing via GitHub Actions or other CI/CD:

### GitHub Actions Example

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        working-directory: packages/drizzle
        run: npm ci
      
      - name: Build
        working-directory: packages/drizzle
        run: npm run build
      
      - name: Publish to npm
        working-directory: packages/drizzle
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup NPM_TOKEN Secret

1. Generate an npm access token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Add it as a secret in GitHub: Settings → Secrets → Actions → New repository secret
3. Name it `NPM_TOKEN`

---

## 🔄 Post-Publishing Tasks

After successfully publishing:

1. **Update CHANGELOG.md**
   - Document all changes in the new version
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

2. **Create GitHub Release**
   - Go to https://github.com/surveilr/std/releases
   - Create a new release for the tag
   - Include release notes from CHANGELOG.md

3. **Announce the Release**
   - Update project documentation
   - Notify users/contributors
   - Update dependent projects

4. **Monitor for Issues**
   - Watch for bug reports
   - Check npm download stats
   - Review user feedback

---

## 🐛 Troubleshooting

### Common Issues

**Error: "You do not have permission to publish"**
- Ensure you're logged in: `npm whoami`
- Verify you have publish rights to @surveilr scope
- Use `--access public` for scoped packages

**Error: "Version already exists"**
- Update version in package.json
- Run `npm version patch/minor/major`

**Build Errors**
- Clean node_modules: `rm -rf node_modules && npm install`
- Clear dist: `rm -rf dist && npm run build`
- Check TypeScript version compatibility

**Missing Files in Published Package**
- Check `files` field in package.json
- Use `npm pack --dry-run` to preview

---

## 📞 Support

For questions or issues:
- GitHub Issues: https://github.com/surveilr/std/issues
- Repository: https://github.com/surveilr/std

