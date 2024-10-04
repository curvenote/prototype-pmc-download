# Downloading content from PMC

This repo has scripts to help download the JATS and supplementary materials from PMC. JATS comes from aws s3 buckets and the media files and supplementary materials come over http/ftp.

Convenience scripts are included in the `package.json`.

## Given a PMC ID is it's JATS available?

```
npm run find -- PMC123456789
```

## Given a PMC ID download the JATS

```
npm run get-xml -- PMC123456789
```

It will be stored in `articles/PMC123456789`.

## Get the supplementary and media files

Given a PMC we need to figure out the location on ftp, there is a non-linear folder structure to deal with, so first we need to get the file listing for the OA collection.

```
npm run refresh-listing
```

Might take a while, but only need to do this once (or refresh is we need to find new stuff).

Then download the media files

```
npm run get-media -- PMC123456789
```

They will also be saved to `articles/PMC123456789`.

## Reference

These utils are using the PMC facilities here:

- [Cloud Service](https://www.ncbi.nlm.nih.gov/pmc/tools/cloud/)
- [AWS S3 Service](https://www.ncbi.nlm.nih.gov/pmc/tools/pmcaws/)
- [FTP Service](https://www.ncbi.nlm.nih.gov/pmc/tools/ftp/#indart)
